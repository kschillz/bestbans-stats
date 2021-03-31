import { Tier, getStats } from './sites/lolalytics';
import * as fs from 'fs';
import got from 'got/dist/source';

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
    }
})();