export async function getChampionIDs(version: string) {
	const url = `http://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;
	const response = await fetch(url);
	const body = await response.json();
	const championIDs = {};
	for (const key in body.data) {
		const champion = body.data[key];
		championIDs[champion.key] = {
			id: champion.id,
			name: champion.name,
		};
	}
	return championIDs;
}
