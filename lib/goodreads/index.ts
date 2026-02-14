import * as scraper from "./scraper";
import * as mobileApi from "./mobile-api";

const useMobileApi = process.env.GOODREADS_USE_MOBILE_API === "true";

const client = useMobileApi ? mobileApi : scraper;

export const fetchUserProfile = client.fetchUserProfile;
export const fetchUserShelves = client.fetchUserShelves;
export const fetchRecentUpdates = client.fetchRecentUpdates;
export const searchUsers = client.searchUsers;

// checkProfileExists is only available on the scraper
export { checkProfileExists } from "./scraper";

export type { GoodreadsUser, GoodreadsBook, GoodreadsActivity, ShelfType } from "./types";
