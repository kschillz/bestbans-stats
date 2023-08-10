import got from "got/dist/source";

export async function getChampionIDs(version: string) {
    const url = `http://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`
    const body: any = await got(url).json();
    const championIDs = {};
    for (const key in body.data) {
        const champion = body.data[key];
        championIDs[champion['key']] = {
            'id': champion['id'],
            'name': champion['name'],
        };
    }
    return championIDs;
}
