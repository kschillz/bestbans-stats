import * as fs from "node:fs";
import { Tier, getStats } from "./sites/lolalytics";

async function getLatestPatch() {
	const url = "https://ddragon.leagueoflegends.com/api/versions.json";
	const response = await fetch(url);
	const body = await response.json();
	return body[0];
}

(async () => {
	let lolalyticsHasData = true;
	const patch = await getLatestPatch();
	const path = `static/${patch}`;
	fs.mkdirSync(path, { recursive: true });
	for (const tier in Tier) {
		const bestBans_api = await getStats(Tier[tier], patch);
		if (bestBans_api.champions.length === 0) {
			lolalyticsHasData = false;
			console.log("lolalytics has no data");
			continue;
		}
		Bun.write(
			`${path}/${tier.toLowerCase()}.json`,
			JSON.stringify(bestBans_api),
		);
		console.log(tier);
	}
	if (lolalyticsHasData) {
		Bun.write(
			"static/meta.json",
			JSON.stringify({
				last_updated: new Date(),
				latest_patch: patch,
			}),
		);
	}
})();
