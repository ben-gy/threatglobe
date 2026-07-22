// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Shared GeoJSON feature → ISO-2 lookup used by both globe and flat map components.

export function isoOf(d: any): string {
  if (!d || !d.properties) return '';
  const p = d.properties;
  const direct =
    (p.ISO_A2_EH && p.ISO_A2_EH !== '-99' && p.ISO_A2_EH) ||
    (p.ISO_A2 && p.ISO_A2 !== '-99' && p.ISO_A2) ||
    p.WB_A2 || p.POSTAL;
  if (direct && direct.length === 2) return direct;
  const name: string = (p.NAME || p.name || p.ADMIN || '').toLowerCase();
  const byName = NAME_TO_ISO2[name];
  if (byName) return byName;
  const num = p.ISO_N3 || p.UN_A3 || d.id;
  return NUM_TO_ISO2[num] || '';
}

const NUM_TO_ISO2: Record<string, string> = {
  '004':'AF','008':'AL','012':'DZ','024':'AO','032':'AR','036':'AU','040':'AT','044':'BS','048':'BH','050':'BD','051':'AM','052':'BB','056':'BE','068':'BO','070':'BA','072':'BW','076':'BR','084':'BZ','090':'SB','096':'BN','100':'BG','104':'MM','108':'BI','112':'BY','116':'KH','120':'CM','124':'CA','140':'CF','144':'LK','148':'TD','152':'CL','156':'CN','170':'CO','178':'CG','180':'CD','188':'CR','191':'HR','192':'CU','196':'CY','203':'CZ','204':'BJ','208':'DK','214':'DO','218':'EC','222':'SV','226':'GQ','231':'ET','232':'ER','233':'EE','242':'FJ','246':'FI','250':'FR','262':'DJ','266':'GA','268':'GE','270':'GM','276':'DE','288':'GH','300':'GR','320':'GT','324':'GN','328':'GY','332':'HT','340':'HN','348':'HU','352':'IS','356':'IN','360':'ID','364':'IR','368':'IQ','372':'IE','376':'IL','380':'IT','384':'CI','388':'JM','392':'JP','398':'KZ','400':'JO','404':'KE','408':'KP','410':'KR','414':'KW','417':'KG','418':'LA','422':'LB','426':'LS','428':'LV','430':'LR','434':'LY','440':'LT','442':'LU','450':'MG','454':'MW','458':'MY','466':'ML','478':'MR','484':'MX','496':'MN','498':'MD','499':'ME','504':'MA','508':'MZ','512':'OM','516':'NA','524':'NP','528':'NL','540':'NC','548':'VU','554':'NZ','558':'NI','562':'NE','566':'NG','578':'NO','586':'PK','591':'PA','598':'PG','600':'PY','604':'PE','608':'PH','616':'PL','620':'PT','624':'GW','626':'TL','630':'PR','634':'QA','642':'RO','643':'RU','646':'RW','682':'SA','686':'SN','688':'RS','694':'SL','702':'SG','703':'SK','704':'VN','705':'SI','706':'SO','710':'ZA','716':'ZW','724':'ES','728':'SS','729':'SD','732':'EH','748':'SZ','752':'SE','756':'CH','760':'SY','762':'TJ','764':'TH','768':'TG','780':'TT','784':'AE','788':'TN','792':'TR','795':'TM','800':'UG','804':'UA','807':'MK','818':'EG','826':'GB','834':'TZ','840':'US','854':'BF','858':'UY','860':'UZ','862':'VE','887':'YE','894':'ZM',
};

const NAME_TO_ISO2: Record<string, string> = {
  'united states of america': 'US', 'united states': 'US', 'russia': 'RU', 'china': 'CN',
  'germany': 'DE', 'france': 'FR', 'united kingdom': 'GB', 'netherlands': 'NL',
  'canada': 'CA', 'brazil': 'BR', 'india': 'IN', 'japan': 'JP', 'australia': 'AU',
  'south korea': 'KR', 'singapore': 'SG', 'turkey': 'TR', 'poland': 'PL', 'ukraine': 'UA',
  'italy': 'IT', 'spain': 'ES', 'south africa': 'ZA', 'iran': 'IR', 'indonesia': 'ID',
  'mexico': 'MX', 'vietnam': 'VN', 'thailand': 'TH', 'taiwan': 'TW', 'hong kong': 'HK',
  'switzerland': 'CH', 'sweden': 'SE', 'finland': 'FI', 'norway': 'NO', 'denmark': 'DK',
  'belgium': 'BE', 'austria': 'AT', 'portugal': 'PT', 'ireland': 'IE', 'greece': 'GR',
  'romania': 'RO', 'hungary': 'HU', 'czechia': 'CZ',
};
