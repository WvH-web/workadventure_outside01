/// <reference path="../node_modules/@workadventure/iframe-api-typings/iframe_api.d.ts" />
import { bootstrapExtra } from "@workadventure/scripting-api-extra";

console.log('Script started successfully');

const JOBFAIR_API_URL = "https://deutsche-online-schule.com/schooltools/verwaltung/api/workadventure_jobfair.php";

interface TiledProperty {
    name: string;
    value: unknown;
}

interface TiledObject {
    name?: string;
    type?: string;
    class?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    properties?: TiledProperty[];
}

interface TiledLayer {
    name: string;
    type: string;
    layers?: TiledLayer[];
    objects?: TiledObject[];
}

interface TiledMap {
    layers: TiledLayer[];
}

interface JobfairStand {
    id: string;
    job?: string;
}

interface JobfairResponse {
    stands?: JobfairStand[];
}

interface JobfairLabelArea {
    standId: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

function collectJobfairLabelAreas(layers: TiledLayer[]): JobfairLabelArea[] {
    const areas: JobfairLabelArea[] = [];

    for (const layer of layers) {
        if (layer.type === "objectgroup") {
            for (const object of layer.objects ?? []) {
                const match = (object.name ?? "").match(/^(\d+)\s*Text$/i);
                if (!match || object.x === undefined || object.y === undefined || object.width === undefined || object.height === undefined) {
                    continue;
                }

                areas.push({
                    standId: `Adventure${match[1].padStart(2, "0")}`,
                    x: object.x,
                    y: object.y,
                    width: object.width,
                    height: object.height
                });
            }
        }

        if (layer.layers) {
            areas.push(...collectJobfairLabelAreas(layer.layers));
        }
    }

    return areas;
}

async function loadJobfairStands(): Promise<Map<string, JobfairStand>> {
    let response = await fetch(JOBFAIR_API_URL, { cache: "no-store" });
    if (!response.ok) {
        console.warn(`Jobfair API responded with ${response.status}. Falling back to local stand data.`);
        response = await fetch("jobfair-stands.json", { cache: "no-store" });
    }

    if (!response.ok) {
        throw new Error(`Could not load job fair stand data. Last status: ${response.status}`);
    }

    const payload = await response.json() as JobfairResponse;
    const stands = new Map<string, JobfairStand>();
    for (const stand of payload.stands ?? []) {
        stands.set(stand.id, stand);
    }
    return stands;
}

async function renderJobfairLabels(): Promise<void> {
    const map = await WA.room.getTiledMap() as TiledMap;
    const labelAreas = collectJobfairLabelAreas(map.layers);
    if (labelAreas.length === 0) {
        return;
    }

    let stands: Map<string, JobfairStand>;
    try {
        stands = await loadJobfairStands();
    } catch (error) {
        console.error("Could not load job fair stand labels", error);
        return;
    }

    for (const area of labelAreas) {
        const job = (stands.get(area.standId)?.job ?? "").trim();
        if (!job) {
            continue;
        }

        WA.room.website.create({
            name: `jobfair-label-${area.standId}`,
            url: `jobfair-label.html?job=${encodeURIComponent(job)}&stand=${encodeURIComponent(area.standId)}`,
            position: {
                x: area.x,
                y: area.y,
                width: area.width,
                height: area.height
            },
            allowApi: false
        });
    }
}

// Waiting for the API to be ready
WA.onInit().then(() => {
    console.log('Scripting API ready');
    console.log('Player tags: ',WA.player.tags)

    // The line below bootstraps the Scripting API Extra library that adds a number of advanced properties/features to WorkAdventure
    bootstrapExtra().then(() => {
        console.log('Scripting API Extra ready');
    }).catch(e => console.error(e));

    renderJobfairLabels().catch(e => console.error(e));
}).catch(e => console.error(e));
