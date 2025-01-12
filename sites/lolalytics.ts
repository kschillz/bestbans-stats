import { type Browser, chromium, type Page } from "playwright";

import { getChampionIDs } from "./ddragon";
import { sleep } from "bun";

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
	EMERALD_PLUS = "emerald_plus",
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
	// average_win_rate: number;
	last_updated: Date;
	champions: ChampionPBI[];
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

interface ChampionLaneStats {
	name: string;
	lane: Lane;
	winRate: number;
	pickRate: number;
	banRate: number;
	gamesPlayed: number;
}

interface ChampionPBI {
	name: string;
	pbi: number;
	id: string;
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

const titleCase = (str: string) =>
	`${str[0].toUpperCase()}${str.slice(1).toLowerCase()}`;

const timer = (msg: string) => {
	console.time(msg);
	return {
		[Symbol.dispose]: () => {
			console.timeEnd(msg);
		},
	};
};

const BASE_URL = "https://lolalytics.com/lol/tierlist/";

async function loadHtml(page: Page, url: string) {
	console.log(url);
	const response = await fetch(url);
	const body = await response.text();
	await page.setContent(body);
}

async function getWinRate(page: Page, tier: Tier, patch: string) {
	using _ = timer("getWinRate");
	const formatted = patch.split(".", 2).join(".");
	const url = `${BASE_URL}?tier=${tier.toString()}&patch=${formatted}`;
	await page.goto(url);

	const winRateElement = await page
		.getByText(`Average ${titleCase(tier)} Win Rate:`)
		.innerText();
	const match = winRateElement.match(/(\d+\.\d+)%/);
	console.log(match);

	if (!match) {
		throw Error("no win rate found");
	}

	return Number(match[1]);
}

async function getTopPBIChampions(page: Page, tier: Tier, patch: string) {
	using _ = timer(`get champion pbi for ${tier}`);
	const formatted = patch.split(".", 2).join(".");
	const url = `${BASE_URL}?tier=${tier.toString()}&patch=${formatted}`;
	console.log(`navigate to ${url}`);
	await page.goto(url, { waitUntil: "domcontentloaded" });

	const championIDs = await getChampionIDs(patch);

	const pbiHeader = page.getByText("Pick Ban Influence.").locator("../..");
	await pbiHeader.click();
	await page.waitForTimeout(1000);

	const nameCells = page
		.locator(`a[href*="build/"]`)
		.filter({ hasNot: page.locator("span") });
	const champions: ChampionPBI[] = [];
	for (const cell of (await nameCells.all()).slice(0, 5)) {
		const row = cell.locator("../..");

		process.env.DEBUG && console.log(await cell.innerText());
		process.env.DEBUG &&
			console.log(await row.locator("div").nth(11).innerText());

		const name = await cell.innerText();
		const championPBI: ChampionPBI = {
			name,
			pbi: Number.parseFloat(await row.locator("div").nth(11).innerText()),
			id: championIDs.find((c) => c.name === name)?.id || "",
		};
		champions.push(championPBI);
	}
	return champions;
}

export async function getStatsv2(page: Page, tier: Tier, patch: string) {
	// const average_win_rate = await getWinRate(page, tier, patch);

	const tierStats = await getTopPBIChampions(page, tier, patch);

	const bestBans: BestBansStats = {
		tier: tier,
		patch: patch,
		// average_win_rate: Number.parseFloat(average_win_rate.toFixed(4)),
		last_updated: new Date(),
		champions: tierStats,
	};

	return bestBans;
}
