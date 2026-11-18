// The Guild's areas, in nav order. Each page path matches its old GitBook path,
// so a link like thegoalieguild.gitbook.io/home/foundation/donate maps to /foundation/donate/.
// The castle homepage will link to these same areas.

export interface NavPage { title: string; path: string }
export interface Section {
  key: string;
  title: string;
  blurb: string;
  path: string;
  pages: NavPage[];
}

export const sections: Section[] = [
  {
    key: 'foundation',
    title: 'The Foundation',
    blurb: 'Who we are: mission, vision, founder and FAQ.',
    path: '/foundation/intro/',
    pages: [
      { title: 'Intro', path: '/foundation/intro/' },
      { title: 'Mission', path: '/foundation/intro/mission/' },
      { title: 'Vision', path: '/foundation/intro/vision/' },
      { title: 'Founder', path: '/foundation/intro/founder/' },
      { title: 'FAQ', path: '/foundation/intro/faq/' },
    ],
  },
  {
    key: 'ggr',
    title: 'GGR',
    blurb: 'The GGR and its recaps.',
    path: '/resources/ggr/',
    pages: [
      { title: 'GGR', path: '/resources/ggr/' },
      { title: 'Recaps', path: '/resources/ggr/recaps/' },
    ],
  },
  {
    key: 'scholarships',
    title: 'Scholarships',
    blurb: 'Scholarships, recipients and the named awards.',
    path: '/foundation/scholarships/',
    pages: [
      { title: 'Scholarships', path: '/foundation/scholarships/' },
      { title: 'Recipients', path: '/foundation/scholarships/recipients/' },
      { title: 'October Saves', path: '/foundation/scholarships/october-saves/' },
      { title: 'Martha Kennedy', path: '/foundation/scholarships/martha-kennedy/' },
    ],
  },
  {
    key: 'lift-the-mask',
    title: 'Lift The Mask',
    blurb: 'Mental health support for goaltenders.',
    path: '/lift-the-mask/intro/',
    pages: [
      { title: 'Intro', path: '/lift-the-mask/intro/' },
      { title: 'Providers', path: '/lift-the-mask/providers/' },
    ],
  },
  {
    key: 'library',
    title: 'The Library',
    blurb: 'Toolkits, research and books for goalies and coaches.',
    path: '/resources/toolkits/',
    pages: [
      { title: 'Toolkits', path: '/resources/toolkits/' },
      { title: 'Research', path: '/resources/research/' },
      { title: 'Books', path: '/resources/books/' },
    ],
  },
  {
    key: 'donate',
    title: 'Donate',
    blurb: 'Support the Guild.',
    path: '/foundation/donate/',
    pages: [{ title: 'Donate', path: '/foundation/donate/' }],
  },
];

export const sectionFor = (path: string) =>
  sections.find((s) => s.pages.some((p) => p.path === path));

export const contact = {
  email: 'info@thegoalieguild.com',
  instagram: 'https://www.instagram.com/thegoalieguild',
  facebook: 'https://www.facebook.com/thegoalieguild',
  liftTheMask: 'https://www.liftthemask.com',
  candid: 'https://www.guidestar.org/profile/47-2675454',
};
