import { Tier, getStats } from './sites/lolalytics';
import * as fs from 'fs';
import got from 'got/dist/source';

async function getLatestPatch() {
    const url = 'https://ddragon.leagueoflegends.com/api/versions.json';
    const body = await got(url).json();
    return body[0];
}

(async () => {
    var lolalyticsHasData = true;
    const patch = await getLatestPatch();
    const path = `static/${patch}`;
    fs.mkdirSync(path, { recursive: true });
    for (const tier in Tier) {
        let bestBans_api = await getStats(Tier[tier], patch);
        if (bestBans_api.champions.length === 0) {
            lolalyticsHasData = false;
            console.log('lolalytics has no data');
            continue;
        }
        fs.writeFileSync(`${path}/${tier.toLowerCase()}.json`, JSON.stringify(bestBans_api));
        console.log(tier);
    }
    if (lolalyticsHasData) {
        fs.writeFileSync('static/meta.json', JSON.stringify({
            last_updated: new Date(),
            latest_patch: patch,
        }));
    }
})();