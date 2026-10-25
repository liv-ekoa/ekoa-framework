// Content for the "Fund your project" packet. Static on purpose: Ekoa does not hold or move money.
// Platform rules change; every entry says where to confirm them.

export interface FundingOption {
  name: string;
  url: string;
  kind: 'Crowdfunding' | 'School or association page' | 'Grant' | 'Fiscal sponsor';
  note: string;
  confirm: string;
}

export interface CountryGuide {
  country: string;
  summary: string;
  options: FundingOption[];
}

const GOFUNDME = (country: string): FundingOption => ({
  name: 'GoFundMe',
  url: 'https://support.gofundme.com/hc/en-us/articles/115010242608',
  kind: 'Crowdfunding',
  note: `Available in ${country}. The organiser needs a bank account in the same country, and the country cannot be changed once the fundraiser is published.`,
  confirm: 'Ask what age and ID they require. Some countries need an adult account holder.',
});

export const COUNTRY_GUIDES: CountryGuide[] = [
  {
    country: 'Kenya',
    summary: 'Mobile money is the usual way to give, so choose a platform that takes it.',
    options: [
      { name: 'M-Changa', url: 'https://www.mchanga.africa', kind: 'Crowdfunding', note: 'Kenyan platform where individuals and groups start campaigns and accept mobile money. GlobalGiving lists it as a partner for individuals in Kenya.', confirm: 'Ask who may open an account and how withdrawals are paid out.' },
    ],
  },
  {
    country: 'Indonesia',
    summary: 'GoFundMe is not available here, so use a local platform and have a teacher or other adult hold the account.',
    options: [
      { name: 'Kitabisa', url: 'https://kitabisa.com', kind: 'Crowdfunding', note: 'The best-known Indonesian platform. It checks the fundraiser with a photo of the national ID (KTP), a selfie with it, and the bank account used for withdrawals.', confirm: 'A student without a KTP probably cannot verify alone, so plan for the teacher to be the account holder. Confirm with Kitabisa.' },
    ],
  },
  {
    country: 'India',
    summary: 'Adults run the campaign. Ask each platform about donations that come from abroad before you promote it internationally.',
    options: [
      { name: 'Ketto', url: 'https://www.ketto.org', kind: 'Crowdfunding', note: 'Its terms exclude minors from using the site. An adult or a registered non-profit can run a campaign on behalf of others. Fees were reported at around 6% plus a set-up charge, which may be out of date.', confirm: 'Ask about fees and about foreign donations. We have not verified the rules that apply to money from outside India.' },
      { name: 'Milaap', url: 'https://milaap.org', kind: 'Crowdfunding', note: 'Focused on social causes and education. Fees were reported at around 5%, which may be out of date.', confirm: 'We have not checked its terms for minors or school projects. Ask them, and ask about foreign donations.' },
    ],
  },
  {
    country: 'New Zealand',
    summary: 'GoFundMe is not available here. Givealittle is the local option.',
    options: [
      { name: 'Givealittle', url: 'https://givealittle.co.nz/help/howgivealittleworks/who', kind: 'Crowdfunding', note: 'Anyone can fundraise. To receive the money you must be over 18 and have a New Zealand bank account. If the person who benefits is under 18, a guardian should receive the funds. Pages are moderated before they go live.', confirm: 'Have the teacher or a guardian be the person who receives the funds.' },
    ],
  },
  {
    country: 'Australia',
    summary: 'GoFundMe works, and state or national school grants are worth checking first.',
    options: [
      GOFUNDME('Australia'),
      { name: 'Junior Landcare Grants (Woolworths)', url: 'https://landcareaustralia.com.au', kind: 'Grant', note: 'Reported grants of up to $1,000 for primary schools and early learning centres. Not for every age group.', confirm: 'We could not confirm that it is open this year. Check with Landcare Australia.' },
    ],
  },
  {
    country: 'Ireland',
    summary: 'GoFundMe works. Government sustainability grants for schools exist and need no crowdfunding.',
    options: [
      GOFUNDME('Ireland'),
      { name: 'Education for Sustainable Development school grants', url: 'https://www.gov.ie/en/department-of-education-and-youth/', kind: 'Grant', note: 'In December 2025 the Department of Education announced grants of €1,000 to €2,500 for 390 primary and post-primary schools.', confirm: 'Ask your teacher to check whether a new round is open.' },
    ],
  },
  {
    country: 'France',
    summary: 'The school’s parents’ association or foyer can collect money for you.',
    options: [
      { name: 'HelloAsso', url: 'https://www.helloasso.com', kind: 'School or association page', note: 'Free for associations (it asks donors for an optional contribution). Many French school associations and foyers already use it, and it issues tax receipts for donors.', confirm: 'The money goes to the association, which then pays for the project. Ask the association’s treasurer.' },
      GOFUNDME('France'),
    ],
  },
  {
    country: 'Switzerland',
    summary: 'GoFundMe works. Ask whether your school’s parents’ association or foundation can collect the money.',
    options: [
      GOFUNDME('Switzerland'),
    ],
  },
];

/** For any country we have no guide for. */
export const OTHER_COUNTRY_GUIDE: CountryGuide = {
  country: 'Other',
  summary: 'We do not have a specific guide for your country yet, so start with these and the questions below.',
  options: [
    GOFUNDME('the 20 countries on its list'),
    { name: 'A fiscal sponsor', url: 'https://support.globalgiving.org/hc/en-us/articles/360026469171-What-is-a-fiscal-sponsor', kind: 'Fiscal sponsor', note: 'A registered non-profit that receives and oversees the money for a project that is not one itself. GlobalGiving accepts unregistered projects through one, but cannot find a sponsor for you.', confirm: 'Both the project and the sponsor apply.' },
  ],
};

const REGION_CODES = 'AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PS PA PG PY PE PH PL PT QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW'.split(' ');

/** Every country, named in English and sorted. Guides exist for only some; the rest get the general guide. */
export const ALL_COUNTRIES: string[] = (() => {
  const names = new Intl.DisplayNames(['en'], { type: 'region' });
  return REGION_CODES.map((c) => names.of(c) ?? c).sort((a, b) => a.localeCompare(b));
})();

export const guideFor = (country: string | undefined) => COUNTRY_GUIDES.find((g) => g.country === country) ?? OTHER_COUNTRY_GUIDE;

export const PLATFORM_QUESTIONS: string[] = [
  'Who is allowed to open the account: what minimum age and what ID?',
  'Which country must the bank account be in?',
  'Can supporters in other countries give, and in which currency?',
  'What fees are taken, and how long until the money reaches the account?',
  'Are donors in our country allowed to claim tax relief, and does the platform issue receipts?',
];

export const ROUTES: { name: string; best: string; how: string }[] = [
  { name: 'School or association collects', best: 'Most schools. Safest for minors.', how: 'Supporters pay the school, its parents’ association or its foundation. The school pays suppliers. No individual ever holds the money.' },
  { name: 'Teacher or guardian runs a campaign', best: 'Where the platform needs an adult account holder.', how: 'The adult opens the campaign for the team. The money lands in their account, so it should move to a school account or straight to suppliers.' },
  { name: 'Grant', best: 'Small, well-defined projects.', how: 'The school applies using the same project summary. No public campaign is needed, and the funder usually pays the school.' },
  { name: 'Fiscal sponsor', best: 'Schools that cannot receive money themselves.', how: 'A registered non-profit holds the funds and releases them against the budget.' },
];

export const PAYING_RULES: { title: string; body: string }[] = [
  { title: 'Money never goes to a student', body: 'Funds are held by the school, an association, a fiscal sponsor or a teacher or guardian. Students plan and spend with an adult, never alone.' },
  { title: 'Pay suppliers directly', body: 'Wherever possible the school pays the shop or contractor from the quote in the budget. If a student must buy something, the teacher approves it first and reimburses against the receipt.' },
  { title: 'One shared budget', body: 'Spend against the budget in your Ekoa project. A line that goes over by more than about 10% needs the teacher’s and the advisor’s sign-off before the money is spent.' },
  { title: 'Keep every receipt', body: 'Photograph each receipt the day you buy. Log what was bought, what it cost and what it was for.' },
  { title: 'Know the currency', body: 'Keep the budget in the currency of the supplier. If supporters give in another currency, note the exchange rate on the day the funds land.' },
  { title: 'Report back and settle up', body: 'Tell supporters what was spent and what happened. Leftover money goes where you said it would in the launch page.' },
];

export const FUNDING_ROLES: { who: string; role: string; does: string }[] = [
  { who: 'Project Lead (student)', role: 'Owns the ask', does: 'Writes the campaign page, posts updates, thanks donors and logs how every shilling, rupiah or dollar was spent.' },
  { who: 'Implementation Team (students)', role: 'Backs the lead', does: 'Collects quotes and receipts, takes photos, and keeps the budget up to date. Two students should always be able to explain the budget.' },
  { who: 'Faculty Liaison (teacher)', role: 'Account holder', does: 'Opens the fundraising account, or co-signs for it, because platforms and local law usually require an adult. Approves the page before it goes public and signs off the spending.' },
  { who: 'Advisor (Partner or school leader)', role: 'Second pair of eyes', does: 'Reviews the budget for realism and checks the money is handled by the school or a registered organisation, not by one person.' },
  { who: 'Guardian', role: 'Consent', does: 'Students under 18 need guardian consent before they are named or photographed on a public page.' },
];

export const PROJECT_SUMMARY: { heading: string; prompt: string; example: string }[] = [
  { heading: 'Title', prompt: 'Say what will exist when you are done.', example: 'Compost bins for the canteen at Nyeri High School' },
  { heading: 'The problem', prompt: 'Two sentences with one number from your own baseline measurement.', example: 'Our canteen throws away about 40 kg of food scraps a day. All of it goes to the landfill.' },
  { heading: 'What we will do', prompt: 'Three to five concrete steps and who does them.', example: 'Build four bins, train the canteen staff, collect scraps every day, use the compost in the school garden.' },
  { heading: 'Who we are', prompt: 'Your school, your team, and the adult who backs you. First names or roles only for anyone under 18.', example: 'Eco Club, 12 students, supported by our teacher Ms. Wanjiru.' },
  { heading: 'The budget', prompt: 'A short table: item, cost, and where the quote came from. Add up to the total you ask for.', example: 'Timber and mesh 8,000 KES, tools 4,500 KES, training 2,500 KES. Total 15,000 KES.' },
  { heading: 'The timeline', prompt: 'When money is needed, when work starts, and when you will report back.', example: 'Build in March, running by April, first report in June.' },
  { heading: 'How we will show it worked', prompt: 'Name the Ekoa metric and the target. Promise to publish the result, even if it falls short.', example: 'Kilograms of food scraps diverted per week. Target 150 kg. Published on our Implementation Record.' },
  { heading: 'What happens to extra money', prompt: 'Decide this before you launch.', example: 'Anything left over goes to the next student project at our school.' },
];

export const FUNDING_STEPS: string[] = [
  'Finish your project plan in Ekoa, with a baseline and a budget. Funders trust a plan with numbers.',
  'Pick your team: a student lead, at least one more student, the teacher who will hold the account, and an advisor.',
  'Choose a platform from the list for your country. Ask what ID and age they require before you build the page.',
  'Write the project summary below. Have the teacher and advisor read it, and check that no under-18 is identifiable without guardian consent.',
  'Launch. Post an update at least every two weeks, with a photo or a number.',
  'Spend only what is in the budget. Keep every receipt and log the spending in your Ekoa project.',
  'Close the loop. Publish the result on your Implementation Record and tell your donors what happened.',
];
