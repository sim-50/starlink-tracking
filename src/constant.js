//used for call API from N2YO,
//get satellite list based on user input(latitude, longtitude, elevation and radius)
//here are constant paraments on API call
export const SAT_BASE_URL = "https://www.n2yo.com/rest/v1/satellite";

export const SAT_API_KEY = "N3HFWE-5B8PF2-7UE3TH-4J0D"; // Don’t copy this, use the API license key you get from N2YO

export const STARLINK_CATEGORY = "52";

export const NEARBY_SATELLITE = `${SAT_BASE_URL}/above`;

export const WORLD_MAP_URL = "https://unpkg.com/world-atlas@1/world/110m.json";

export const SATELLITE_POSITION_URL = `${SAT_BASE_URL}/positions`;
