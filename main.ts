import * as fs from "node:fs";
import { type Browser, chromium, type Page } from "playwright";

import { Tier, getStatsv2 } from "./sites/lolalytics";

async function getLatestPatch() {
	const url = "https://ddragon.leagueoflegends.com/api/versions.json";
	const response = await fetch(url);
	const body = await response.json();
	const patch: string = body[0];
	const formatted = patch.split(".", 2).join(".");
	return formatted;
}

const usePlaywright = async () => {
	process.env.DEBUG && console.log("starting playwright");
	const browser = await chromium.launch();
	const page = await browser.newPage();
	return {
		page,
		[Symbol.asyncDispose]: async () => {
			process.env.DEBUG && console.log("shutting down playwright");
			process.env.DEBUG &&
				(await page.screenshot({ path: `shutdown-${Date.now()}.png` }));
			await page.close();
			await browser.close();
		},
	};
};

(async () => {
	let lolalyticsHasData = true;
	const patch = await getLatestPatch();
	const path = `static/${patch}`;
	fs.mkdirSync(path, { recursive: true });
	await using pw = await usePlaywright();
	const { page } = pw;
	for (const tier in Tier) {
		console.log(tier);
		const bestBans_api = await getStatsv2(page, Tier[tier], patch);
		process.env.DEBUG && console.debug(bestBans_api);
		console.log(bestBans_api.champions.map((c) => c.name).join(", "));
		if (bestBans_api.champions.length === 0) {
			lolalyticsHasData = false;
			console.warn("lolalytics has no data");
			break;
		}
		Bun.write(
			`${path}/${tier.toLowerCase()}.json`,
			JSON.stringify(bestBans_api),
		);
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
