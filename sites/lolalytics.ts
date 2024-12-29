import { getChampionIDs } from "./ddragon";

export enum Tier {
	IRON = "iron",
	BRONZE = "bronze",
	SILVER = "silver",
	GOLD = "gold",
	PLATINUM = "platinum",
	EMERALD = "emerald",
	DIAMOND = "diamond",
	MASTER = "master",
	GRANDMASTER = "grandmaster",
	CHALLENGER = "challenger",
	PLATINUM_PLUS = "platinum_plus",
}

export enum Region {
	ALL = "all",
	NA = "na",
}

enum TierListTier {
	S_PLUS = 1,
	S = 2,
	S_MINUS = 3,
	A_PLUS = 4,
	A = 5,
	A_MINUS = 6,
	B_PLUS = 7,
	B = 8,
	B_MINUS = 9,
	C_PLUS = 10,
	C = 11,
	C_MINUS = 12,
	D_PLUS = 13,
	D = 14,
	D_MINUS = 15,
}

enum Lane {
	TOP = "top",
	JUNGLE = "jungle",
	MIDDLE = "middle",
	BOTTOM = "bottom",
	SUPPORT = "support",
}

enum LaneID {
	TOP = 1,
	JUNGLE = 2,
	MIDDLE = 3,
	BOTTOM = 4,
	SUPPORT = 5,
}

interface BestBansChampionStats {
	key: string;
	id: string;
	name: string;
	pick_rate: number;
	win_rate: number;
	ban_rate: number;
	games_played: number;
	ban_score?: number;
	lolalytics_lane_stats?: LolalyticsLaneStats[];
}

interface BestBansStats {
	tier: Tier;
	patch: string;
	average_win_rate: number;
	last_updated: Date;
	champions: BestBansChampionStats[];
}

interface LolalyticsLaneStats {
	rank: number;
	lane: LaneID;
	tier: TierListTier;
	games_won_in_lane: number;
	games_played_in_lane: number;
	games_played_all: number;
	ban_rate: number;

	// ignore these
	best_rank?: number;
	best_win?: string;
	best_games?: number;
	best_win_rate_delta?: number;
}

interface LolalyticsStats {
	games_won: number;
	games_played: number;
	ban_rate: number;
}

function jackson_z(winRate, gamesPlayed, expectedWinRate) {
	//  http://www.sthda.com/english/wiki/one-proportion-z-test-in-r
	//  z = (p_0 - p_e) / sqrt(p_o * q / n)
	//  p_0 = win rate
	//  p_e = average win rate for the tier
	//  q = 1 - p_0
	//  n = games played
	return (
		(winRate - expectedWinRate) /
		Math.sqrt((winRate * (1 - winRate)) / gamesPlayed)
	);
}

function convertLolalyticsLaneStats(input): LolalyticsLaneStats {
	if (input === undefined) {
		return;
	}
	return {
		rank: input[0],
		lane: input[1],
		tier: input[2],
		games_won_in_lane: input[3],
		games_played_in_lane: input[4],
		games_played_all: input[5],
		ban_rate: input[6],
	};
}

function mergeLolalyticsStats(stats: LolalyticsLaneStats[]): LolalyticsStats {
	const emptyStats: LolalyticsStats = {
		ban_rate: 0,
		games_played: 0,
		games_won: 0,
	};
	stats.reduce<LolalyticsStats>((acc, laneStats) => {
		acc.ban_rate = laneStats.ban_rate;
		acc.games_played += laneStats.games_played_in_lane;
		acc.games_won += laneStats.games_won_in_lane;
		return acc;
	}, emptyStats);
	return emptyStats;
}

async function parseHtml(dom) {}

export async function getStats(
	tier: Tier,
	patch: string,
	region: Region = Region.ALL,
	storeLaneStats = false,
): Promise<BestBansStats> {
	const url = `https://ax.lolalytics.com/tierlist/1/?lane=all&patch=${patch}&tier=${tier}&queue=420&region=${region}`;
	const response = await fetch(url);
	const body = await response.json();
	const championIDs = await getChampionIDs(patch);
	const totalGames = body.pick;
	const avgWinRate = body.win / totalGames;

	const bestBans: BestBansStats = {
		tier: tier,
		patch: patch,
		average_win_rate: Number.parseFloat(avgWinRate.toFixed(4)),
		last_updated: new Date(),
		champions: [],
	};
	for (const key in championIDs) {
		const championLaneStats: LolalyticsLaneStats[] = [];
		for (const lane in body.lane) {
			if (body.lane[lane].cid[key] !== undefined) {
				const laneStats = convertLolalyticsLaneStats(body.lane[lane].cid[key]);
				championLaneStats.push(laneStats);
			}
		}
		if (championLaneStats.length === 0) {
			continue;
		}
		const mergedStats = mergeLolalyticsStats(championLaneStats);
		const championStats: BestBansChampionStats = {
			key: key,
			id: championIDs[key].id,
			name: championIDs[key].name,
			pick_rate: Number.parseFloat(
				(mergedStats.games_played / totalGames).toFixed(6),
			),
			win_rate: Number.parseFloat(
				(mergedStats.games_won / mergedStats.games_played).toFixed(4),
			),
			ban_rate: Number.parseFloat(mergedStats.ban_rate.toFixed(4)),
			games_played: mergedStats.games_played,
		};
		championStats.ban_score = Number.parseFloat(
			jackson_z(
				championStats.win_rate,
				championStats.games_played,
				bestBans.average_win_rate,
			).toFixed(4),
		);
		if (storeLaneStats) {
			championStats.lolalytics_lane_stats = championLaneStats;
		}
		bestBans.champions.push(championStats);
	}
	return bestBans;
}
