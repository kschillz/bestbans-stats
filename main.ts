import { Tier, getStats } from './sites/lolalytics';
import * as fs from 'fs';
import got from 'got/dist/source';

// getStats_puppeteer(Tier.SILVER);
// getStats_puppeteer(Tier.PLATINUM_PLUS);

async function getLatestPatch() {
    const url = 'https://ddragon.leagueoflegends.com/api/versions.json';
    const body = await got(url).json();
    return body[0];
}

(async () => {
    for (const tier in Tier) {
        const patch = await getLatestPatch();
        const path = `static/${patch}`;
        fs.mkdirSync(path, { recursive: true });
        let bestBans_api = await getStats(Tier[tier], patch);
        fs.writeFileSync(`${path}/${tier.toLowerCase()}.json`, JSON.stringify(bestBans_api));
        console.log(tier);
        bestBans_api.champions.sort((x, y) => y.ban_score - x.ban_score).slice(0, 5).forEach(champion => {
            console.log(`\t${champion.name} | ${champion.win_rate} | ${champion.ban_score}`);
        });
    }
})();