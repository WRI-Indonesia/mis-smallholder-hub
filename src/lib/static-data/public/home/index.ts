import Papa from "papaparse";
import heroCsv from "./hero.csv";
import statsCsv from "./stats.csv";
import regionsCsv from "./regions.csv";
import partnersCsv from "./partners.csv";
import contentCsv from "./content.csv";
import newsCsv from "./news.csv";

export type HeroImage = {
  id: string;
  url: string;
  alt: string;
};

export type HomeStat = {
  id: string;
  label: string;
  value: string;
};

export type HomeRegion = {
  id: string;
  name: string;
  description: string;
  groupsCount: string;
  membersCount: string;
  areaCount: string;
  iconColor: string;
};

export type HomePartner = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

export type HomeContent = {
  id: string;
  title: string;
  subtitle: string;
  action1: string;
  action2: string;
};

export type HomeNews = {
  id: string;
  title: string;
  category: string;
  publishDate: string;
  thumbnail: string;
};

export const heroImages: HeroImage[] = Papa.parse(heroCsv, { header: true, skipEmptyLines: true }).data as HeroImage[];
export const homeStats: HomeStat[] = Papa.parse(statsCsv, { header: true, skipEmptyLines: true }).data as HomeStat[];
export const homeRegions: HomeRegion[] = Papa.parse(regionsCsv, { header: true, skipEmptyLines: true }).data as HomeRegion[];
export const homePartners: HomePartner[] = Papa.parse(partnersCsv, { header: true, skipEmptyLines: true }).data as HomePartner[];

const rawContent = Papa.parse(contentCsv, { header: true, skipEmptyLines: true }).data as HomeContent[];
export const homeContent = rawContent.reduce((acc, row) => {
  if (row.id) acc[row.id] = row;
  return acc;
}, {} as Record<string, HomeContent>);

export const homeNewsList: HomeNews[] = Papa.parse(newsCsv, { header: true, skipEmptyLines: true }).data as HomeNews[];
