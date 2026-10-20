/** Landing site header navigation (`LandingHero` / `Header`) */
export const LANDING_NAV_ITEMS = [
  { label: "Bluetti", link: "/bluetti" },
  { label: "Products", link: "/products" },
  { label: "Customers", link: "/customers" },
  { label: "Installers", link: "/installers/landing" },
  { label: "Design Platform", link: "/designs" },
  { label: "Services", link: "/services" },
  { label: "About Us", link: "/about-us" },
] as const;

/** Home page — hero (`/`, Figma Final Designs 1782:622) */
export const HOME_PAGE = {
  hero: {
    title: {
      line1: "Power Your Home with Premium",
      brand: "BLUETTI",
      line2: "Energy Storage",
    },
    subtitle:
      "Easylink Solar installations by Solar Accreditation Australia Accredited Professional Installers.",
    primaryCta: { label: "Solar Design", href: "/designs" },
    secondaryCta: { label: "Explore Products", href: "/products" },
    stats: [
      { value: "11,000+", label: "quotes created" },
      { value: "500+", label: "certified installers" },
    ],
    slides: [
      { type: "video" as const, src: "/videos/homeHero.mp4" },
      {
        type: "image" as const,
        src: "/images/home/hero-slide-2.png",
        alt: "Solar installation",
      },
      {
        type: "image" as const,
        src: "/images/home/hero-slide-3.png",
        alt: "Solar installation",
      },
    ],
    features: [
      {
        iconId: "AboutUsHeroSun" as const,
        title: "Solar Generation",
        subtitle: "Harness the sun",
      },
      {
        iconId: "AboutUsHeroBolt" as const,
        title: "Smart Storage",
        subtitle: "EP760 & EP2000",
      },
      {
        iconId: "AboutUsHeroHome" as const,
        title: "Home Power",
        subtitle: "24/7 backup",
      },
      {
        iconId: "AboutUsHeroEv" as const,
        title: "EV Ready",
        subtitle: "Charge overnight",
      },
      {
        iconId: "AboutUsHeroShield" as const,
        title: "Dual Core Safety Guard",
        subtitle: "Advanced protection",
      },
    ],
  },
} as const;

/** Bluetti EP2000 product page — hero (`/bluetti`) */
export const BLUETTI_EP2000_HERO = {
  title: {
    brand: "BLUETTI",
    product: "Home Battery EP2000",
  },
  subtitle: "Power Your Whole Home On Sunshine",
  backgroundImageSrc:
    "/images/ep2000/69fed828eb99db6c54cd35d6_EP2000_BN-1_2.png",
  backgroundImageAlt:
    "Modern home at dusk with BLUETTI EP2000 home battery and rooftop solar panels",
} as const;

/** Bluetti EP2000 — product combo tabs (`/bluetti`) */
export const BLUETTI_EP2000_COMBO_SECTION = {
  heading: "Your Best Step toward Energy Independence",
  subheading:
    "Secure Your Battery Rebate Before It Ends (Install after 1st May 2026)",
  comboLabel: "BLUETTI Home Battery — EP2000 Combos",
  warrantyBadge: "10 year warranty",
  note: {
    title: "Note:",
    items: [
      "Prices after federal rebate, with basic installation included. Eligibility and rebate amounts may vary—confirm with your installer.",
      "Price shown is for metro areas in Sydney (NSW), Brisbane (QLD), and Victoria (VIC). Regional pricing may differ.",
      "Offer is valid for installation completed after 1 May 2026. For enquiries contact",
    ],
    email: "au@bluetti.com",
    emailHref: "mailto:au@bluetti.com",
  },
  tabs: [
    {
      id: "22_1kwh" as const,
      tabLabel: "22.1kWh",
      batteryModules: 3,
      priceLine: "A$12,900* (incl. GST) Installation Included",
      specsLine: "20kW | 22.1kWh",
      imageSrc:
        "/images/ep2000/69fee5f674d0dbc73ac1a248_37451_2x_efee59fb-8810-43fb-b358-f422086bf8aa.webp",
      imageAlt:
        "BLUETTI EP2000 home battery stack with three B700 battery modules",
      dimLastThreeHeavyAppliances: true,
    },
    {
      id: "29_49kwh" as const,
      tabLabel: "29.49kWh",
      batteryModules: 4,
      priceLine: "A$14,900* (incl. GST) Installation Included",
      specsLine: "20kW | 29.49kWh",
      imageSrc:
        "/images/ep2000/69fee6e8c1734fecd47b9a7a_2x_4dec8179-4b1a-45b3-a965-153a88e92f02.webp",
      imageAlt:
        "BLUETTI EP2000 home battery stack with four B700 battery modules",
      dimLastThreeHeavyAppliances: false,
    },
    {
      id: "51_61kwh" as const,
      tabLabel: "51.61kWh",
      batteryModules: 7,
      priceLine: "A$22,900* (incl. GST) Installation Included",
      specsLine: "20kW | 51.61kWh",
      imageSrc:
        "/images/ep2000/69fee7571569da25f02d0be7_37451_2x_add44bc1-ec2e-4291-941d-654e1ed1fe68.webp",
      imageAlt:
        "BLUETTI EP2000 home battery stack with seven B700 battery modules",
      dimLastThreeHeavyAppliances: false,
    },
  ],
} as const;

export const BLUETTI_EP2000_ESSENTIAL_APPLIANCES = [
  { iconId: "lighting" as const, label: "Lighting" },
  { iconId: "router" as const, label: "Wi-Fi Router" },
  { iconId: "freezer" as const, label: "Freezer" },
  { iconId: "television" as const, label: "Television" },
  { iconId: "washer" as const, label: "Washer/Dryer" },
  { iconId: "laptop" as const, label: "Laptop/Home PC" },
] as const;

export const BLUETTI_EP2000_HEAVY_APPLIANCES = [
  { iconId: "air_conditioner" as const, label: "Air Conditioner" },
  { iconId: "dishwasher" as const, label: "Dishwasher" },
  { iconId: "electric_oven" as const, label: "Electric Oven" },
  { iconId: "heat_pump" as const, label: "Heat Pump" },
  { iconId: "pool_pump" as const, label: "Pool Pump" },
  { iconId: "vehicle" as const, label: "Electric Vehicle" },
] as const;

/** Bluetti EP2000 — technology feature grid (`/bluetti`), text baked into images */
export const BLUETTI_EP2000_TECH_PIONEER = {
  heading: "Technology Pioneer in Clean Energy",
  desktopRows: [
    {
      src: "/images/ep2000/69feeb2df6a1e8f116354f89_37420_2x-2.webp",
      alt: "BLUETTI EP2000: 20kW three-phase output for whole-home power and 98% inverter efficiency",
    },
    {
      src: "/images/ep2000/69feeb7b2311bfbc123c8fb5_37435_2x_2001628c-7deb-44c3-8d89-6fe4a35f5619.webp",
      alt: "BLUETTI EP2000: up to 40kWp solar array support and Shade Boost technology",
    },
    {
      src: "/images/ep2000/69feeb48fd693f54b1540a2f_37419_2x_7c64035d-bf03-4905-a232-8423cf4d1276.webp",
      alt: "BLUETTI EP2000: efficient standby power, modular design up to 60kW and 154.8kWh, VPP ready",
    },
    {
      src: "/images/ep2000/69feeb641e118e4eb7a5a107_37434_2x_e12f4b3c-2a85-4404-852f-633e031532d5.webp",
      alt: "BLUETTI EP2000: ultra-quiet operation below 50dB, IP65 outdoor rating, and sub-10ms backup",
    },
  ],
  mobileRows: [
    {
      src: "/images/ep2000/69feec6eeb334ce729440ced_37519_2x_f5acdfd9-5117-4960-ad5a-50b33dc9817c.webp",
      alt: "BLUETTI EP2000: 20kW three-phase output — power your entire home",
    },
    {
      src: "/images/ep2000/69feec551f30f5e609fadb19_37523_2x-1.webp",
      alt: "BLUETTI EP2000: 40kWp solar array supported",
    },
    {
      src: "/images/ep2000/69feec8883307ad80c2a1230_37520_2x_2c0ec4c0-e685-43bc-913b-2e394e005e4b.webp",
      alt: "BLUETTI EP2000: Shade Boost — more energy from shaded panels",
    },
    {
      src: "/images/ep2000/69feecaa8fd2a278ff9d6884_37426_2x_54024a50-1a85-42aa-a40a-1d46c23231ca.webp",
      alt: "BLUETTI EP2000: 98% inverter efficiency and modular battery design",
    },
    {
      src: "/images/ep2000/69feecc5b2ea42bf1e5beb41_37425_2x_747bb97f-1332-4e01-a592-551ccd2c13eb.webp",
      alt: "BLUETTI EP2000: 65W standby energy savings and VPP readiness",
    },
    {
      src: "/images/ep2000/69feecdc8dd451e8f6bf4587_37526_2x_75f661b6-1800-4649-b2be-4dfe95046005.webp",
      alt: "BLUETTI EP2000: IP65 rated — dust-tight and water resistant",
    },
    {
      src: "/images/ep2000/69feed100e255f57a0e86ed3_37427_2x_713cac96-5d1e-47f0-910a-bee3ae099e2a.webp",
      alt: "BLUETTI EP2000: under 50dB quiet operation and seamless sub-10ms backup",
    },
  ],
} as const;

/** Bluetti EP2000 — 6-layer safety + Splide carousel (`/bluetti`) */
export const BLUETTI_EP2000_SAFETY_SECTION = {
  heading: "6-Layer Safety Protection",
  description:
    "6-Layer Safety Protection System covers cells to structure, with emergency vents and robust network security to safeguard your home and family.",
  diagram: {
    src: "/images/ep2000/69fefff76667255e36b85cd3_PNG_1_2x_2435104c-7b10-477b-b102-2a1bd3a8c473.webp",
    alt: "BLUETTI EP2000 six-layer internal safety structure diagram",
    width: 707,
    height: 767,
  },
  slides: [
    {
      id: "cell-safety",
      title: "Cell Safety",
      wide: false,
      imageSrc:
        "/images/ep2000/69ff01d4ad19668aae64da9b_Cell_Safety_2x-3.webp",
      imageAlt: "BLUETTI cell-level safety — battery cells on circuit board",
    },
    {
      id: "pressure-valve",
      title: "Pressure Valve",
      wide: false,
      imageSrc:
        "/images/ep2000/69ff02563121bcbfbaad6c13_Pressure_Valve_2x-1.webp",
      imageAlt: "BLUETTI EP2000 pressure relief valves with safety venting",
    },
    {
      id: "pack-protection",
      title: "Pack Protection",
      wide: true,
      imageSrc:
        "/images/ep2000/69ff0270c09419d3996eab52_Pack_Protection_2x-1.webp",
      imageAlt: "BLUETTI EP2000 modular pack protection and enclosure",
    },
    {
      id: "pcs-guard",
      title: "PCS Guard",
      wide: false,
      imageSrc:
        "/images/ep2000/69ff02bd47e8898e51f79d09_PCS_Guard_2x-3.webp",
      imageAlt: "BLUETTI PCS guard — power conversion system protection",
    },
    {
      id: "hv800-control",
      title: "HV800 Control",
      wide: false,
      imageSrc:
        "/images/ep2000/69ff02dfc09419d3996eaf5d_HV800_Control_2x-1.webp",
      imageAlt: "BLUETTI HV800 control module internal safety electronics",
    },
    {
      id: "data-security",
      title: "Data Security",
      wide: true,
      imageSrc:
        "/images/ep2000/69ff03026a72a27cb976e3f1_Data_Security_2x-1.webp",
      imageAlt: "BLUETTI network and data security for connected home backup",
    },
  ],
} as const;

/** Bluetti EP2000 — fullscreen cinematic video (`/bluetti`) */
export const BLUETTI_EP2000_CINEMA_VIDEO = {
  headingLine1: "Power Your Whole",
  headingLine2: "Home On Sunshine",
  ctaLabel: "Watch Video",
  videoSrcMp4: "/videos/solarWall.mp4",
  videoAriaLabel:
    "Cinematic view of home energy and BLUETTI solar wall integration",
} as const;

/** Bluetti EP2000 — sun savings gradient band (`/bluetti`) */
export const BLUETTI_EP2000_SUN_BILLS_SECTION = {
  heading: "Let the Sun Slash Your Power Bills— Up to 90% Off",
  bodyIntro:
    "Imagine powering your entire home with clean, free energy from the sun. The EP2000 ESS makes it real - ",
  bodyBold1:
    "with massive solar input, powerful output, and flexible storage that can cut your reliance on the grid by up to 90%.",
  bodyMid: " Pay way less on electricity, stay in full control, and ",
  bodyBold2: "potentially recoup your investment in just 3.6 years!",
  footnote: "* Results vary by household. For reference only.",
} as const;

/** Bluetti EP2000 — solar use case tabs + video (`/bluetti`) */
export const BLUETTI_EP2000_USE_CASE_SECTION = {
  heading: "Power Your Whole Home On Sunshine",
  tabs: [
    {
      id: "maximise-solar" as const,
      tabLabel: "Maximise Solar",
      description:
        "Store excess solar power during the day, then use it at night or on cloudy days. Watch your electricity bills shrink as your home runs mostly on your own sunshine.",
      videoSrc: "/videos/homeHero.mp4",
      videoAriaLabel:
        "Animation of a modern home maximising daytime solar energy with EP2000 storage",
    },
    {
      id: "home-backup" as const,
      tabLabel: "Home Backup",
      description:
        "Storms, outages, or grid failures won't slow you down. EP2000 intelligently charges up beforehand and keeps your home running without a hitch.",
      videoSrc: "/videos/homeBackupEp2000.mp4",
      videoAriaLabel:
        "Home backup scenario with EP2000 keeping lights on during an outage",
    },
    {
      id: "tou-savings" as const,
      tabLabel: "TOU Savings",
      description:
        "Charge when electricity is cheap, use stored power when rates soar — even without solar, you save.",
      videoSrc: "/videos/TOUSavings.mp4",
      videoAriaLabel:
        "Time-of-use savings: charging when rates are low and powering the home from stored energy",
    },
    {
      id: "off-grid-freedom" as const,
      tabLabel: "Off-Grid Freedom",
      description:
        "Whether it's a remote farm, a weekend cabin, or a dream home far from the grid — EP2000 gives you quiet, reliable off-grid power without the noise or cost of a generator.",
      videoSrc: "/videos/OffGridFreedom.mp4",
      videoAriaLabel:
        "Off-grid property powered quietly by BLUETTI EP2000 without a fuel generator",
    },
  ],
} as const;

/** Bluetti EP2000 — all-in-one lifestyle fullscreen band (`/bluetti`) */
export const BLUETTI_EP2000_ALL_IN_ONE_SECTION = {
  heading: "EP2000 All-in-One",
  body:
    "In 2024, 65% of Australia's energy still comes from fossil fuels — the goal is 18% by 2030. With rising prices and new incentives, now is the best time to go solar. EP2000 gives your home clean power, energy savings, and independence.",
  footnote: "Data source: Clean Energy Wire.",
  imageSrc:
    "/images/ep2000/69ff13cfc1734fecd47dd71b_27540_2x_9ddad256-4ae7-4016-a0a0-556efc085f5b.webp",
  imageAlt:
    "BLUETTI EP2000 and battery stacks in a mountain valley setting at dusk",
} as const;

/** Bluetti EP2000 — second fullscreen video separator (`/bluetti`) */
export const BLUETTI_EP2000_BACKUP_CINEMA_SECTION = {
  heading: "Power Your Whole Home On Sunshine",
  body:
    "The EP2000 provides up to 20kW of power from a single unit*, and with 3 units in parallel, you can reach a powerful 60kW. Power everything from your electric vehicle and stove to all your household devices, achieving complete energy independence.",
  footnote:
    "* In off-grid mode without solar connection, EP2000 outputs 10.5kW (with 2 B700 batteries) or 15.5kW (with 3 B700 batteries). A full 20kW output requires 4 or more battery modules.",
  videoSrcMp4: "/videos/backupEp2000.mp4",
  videoAriaLabel:
    "Cross-section of a solar-powered home at night with energy flowing to appliances and EV",
} as const;

/** Bluetti EP2000 — app CTA (video + copy + store badges) (`/bluetti`) */
export const BLUETTI_EP2000_APP_CTA_SECTION = {
  heading: "Smart Energy, Just a Tap Away",
  videoSrcMp4: "/videos/ep2000CTA.mp4",
  videoAriaLabel:
    "Hand holding a phone with the BLUETTI energy app in front of a modern home at dusk",
  bullets: [
    {
      label: "Energy Control",
      body: "Manage your energy from anywhere with our simple app.",
    },
    {
      label: "Real-Time Insights",
      body: "See your energy production, storage, and usage instantly.",
    },
    {
      label: "One-Tap Mode Switch",
      body: "Quickly switch between Self-Consumption, Time of Use, Backup, or Custom modes.",
    },
    {
      label: "Fast Updates",
      body: "Enjoy new features quickly with OTA updates in just 5 minutes.",
    },
  ],
  googlePlayBadgeSrc: "/images/ep2000/google-play-store.png",
  googlePlayBadgeAlt: "Get it on Google Play",
  appleBadgeAlt: "Download on the App Store",
  /** Replace with your live App Store / Play listing URLs when available. */
  appStoreHref: "#" as const,
  playStoreHref: "#" as const,
} as const;

export type DesignsPropertyType = {
  id: "residential" | "commercial" | "apartments";
  label: string;
  imageSrc: string;
  imageAlt: string;
};

export const DESIGNS_PROPERTY_TYPES: DesignsPropertyType[] = [
  {
    id: "residential",
    label: "Residential",
    imageSrc: "/images/home/solar-panel-design.png",
    imageAlt: "Residential solar panels on a house roof",
  },
  {
    id: "commercial",
    label: "Commercial",
    imageSrc: "/images/home/solar-panel-design-2.png",
    imageAlt: "Commercial building rooftop with solar panels",
  },
  {
    id: "apartments",
    label: "Apartments",
    imageSrc: "/images/home/solar-panel-design-3.png",
    imageAlt: "Apartment rooftop solar installation",
  },
];

export type DesignsAddressField = {
  id: "name" | "email";
  label: string;
  type: "text" | "email";
};

export type DesignsMapLocation = {
  lat: number;
  lng: number;
};

export const DESIGNS_REGISTER_STEP = {
  title: "Let's Design your Solar and battery system",
  summaryLines: [
    "This helps us to send your design",
    "and quote free of cost.",
  ],
  description:
    "This allows to us to start our first step towards a complete peace of mind and dedicated service towards our customers.",
  fields: [
    { id: "name", label: "Name", type: "text" },
    { id: "email", label: "Email", type: "email" },
  ] satisfies DesignsAddressField[],
  defaultValues: {
    name: "Charli Abdo",
    email: "charl23772@gmail.com",
    phone: "61451503035",
  },
  phoneLabel: "Phone number",
  phoneCountry: "au",
  phonePlaceholder: "0451 503 035",
} as const;

export const DESIGNS_LOCATION_STEP = {
  title: "Lets Design your System, enter your address",
  inputLabel: "Enter your address",
  inputPlaceholder: "e.g. 42 Bondi Rd, Bondi, NSW 2026",
  defaultZoom: 20,
  defaultCenter: { lat: -33.8688, lng: 151.2093 },
  mapType: "satellite" as const,
} as const;

export type DesignsSolarPanelMetric = {
  id: "total-roof-area" | "usable-roof-area" | "panels-fit";
  label: string;
  actionLabel: string;
};

/**
 * Map overlays: only draw panels/outlines near the user’s pin so a large
 * Solar “building” footprint does not flood the whole viewport.
 */
export const DESIGNS_SOLAR_PANEL_MAP = {
  /** Haversine distance from selected pin → panel center (meters). */
  maxPanelDistanceFromPinMeters: 65,
} as const;

export const DESIGNS_SOLAR_PANEL_STEP = {
  title: "Our AI has found your roof",
  descriptionLines: [
    "You can change the roof area. Select the",
    "roof and edit the roof. Add new roof and edit to",
    "allow a perfect selection.",
  ],
  metrics: [
    {
      id: "total-roof-area",
      label: "Total Roof Area",
      actionLabel: "Edit",
    },
    {
      id: "usable-roof-area",
      label: "Usable Roof Area",
      actionLabel: "Edit",
    },
    {
      id: "panels-fit",
      label: "Panels that can fit on your roof",
      actionLabel: "Edit",
    },
  ] satisfies DesignsSolarPanelMetric[],
  mapActions: {
    primary: "Edit",
    secondary: "ADD New Roof",
  },
} as const;

/** Master dashboard (Figma Final Designs 3:11526) */
export const MASTER_DASHBOARD_TITLE = "Distributor Dashboard" as const;

export const MASTER_DASHBOARD_NAV = [
  { id: "overview", label: "Overview", href: "/master/dashboard" },
  { id: "installers", label: "Installers", href: "/master/installers" },
  {
    id: "products",
    label: "Products & Pricing",
    href: "/master/products-pricing",
  },
  { id: "invoices", label: "Invoices", href: "/master/invoices" },
  { id: "payments", label: "Payments", href: "/master/payments" },
  { id: "calls", label: "Calls", href: "/master/calls" },
] as const;

/** Master — Installers (Figma 3:13117) */
export const MASTER_INSTALLERS_PAGE = {
  title: "Member Installers",
  subtitle: "20 registered installers hosting Easylink Designer",
} as const;

export type MasterInstallersFilterId =
  | "all"
  | "active"
  | "pending"
  | "suspended";

export const MASTER_INSTALLERS_FILTERS = [
  { id: "all" as const, label: "All", count: 20 },
  { id: "active" as const, label: "Active", count: 15 },
  { id: "pending" as const, label: "Pending", count: 3 },
  { id: "suspended" as const, label: "Suspended", count: 2 },
] as const;

export type MasterInstallerStatus = Exclude<MasterInstallersFilterId, "all">;

export type MasterInstallerLocation = {
  city: string;
  state: "NSW" | "VIC" | "QLD" | "SA" | "WA";
};

export type MasterInstallerEntry = {
  id: string;
  initials: string;
  name: string;
  status: MasterInstallerStatus;
  rating: string;
  location: MasterInstallerLocation;
  customers: number;
  pipeline: string;
  installsMtd: number;
  conversion: string;
  conversionDelta: string;
  revenue: string;
  revenueDelta: string;
  avatarClass:
    | "master-avatar-yellow"
    | "master-avatar-orange"
    | "master-avatar-slate"
    | "master-avatar-warm-border"
    | "master-avatar-amber-funnel"
    | "master-avatar-navy"
    | "master-avatar-orange-2";
};

export const MASTER_INSTALLERS_ROWS: MasterInstallerEntry[] = [
  {
    id: "sm",
    initials: "SM",
    name: "SolarMax Pro",
    status: "active",
    rating: "4.9",
    location: { city: "Sydney", state: "NSW" },
    customers: 98,
    pipeline: "$4.2M",
    installsMtd: 22,
    conversion: "34.2%",
    conversionDelta: "+3.1%",
    revenue: "$4.2M",
    revenueDelta: "+18%",
    avatarClass: "master-avatar-yellow",
  },
  {
    id: "gg",
    initials: "GG",
    name: "GreenGrid Energy",
    status: "active",
    rating: "4.8",
    location: { city: "Melbourne", state: "VIC" },
    customers: 87,
    pipeline: "$3.8M",
    installsMtd: 19,
    conversion: "31.5%",
    conversionDelta: "+2.4%",
    revenue: "$3.8M",
    revenueDelta: "+14%",
    avatarClass: "master-avatar-orange",
  },
  {
    id: "sp",
    initials: "SP",
    name: "SunPeak Solutions",
    status: "active",
    rating: "4.7",
    location: { city: "Brisbane", state: "QLD" },
    customers: 76,
    pipeline: "$3.4M",
    installsMtd: 17,
    conversion: "29.8%",
    conversionDelta: "+1.9%",
    revenue: "$3.4M",
    revenueDelta: "+11%",
    avatarClass: "master-avatar-slate",
  },
  {
    id: "bs",
    initials: "BS",
    name: "BrightStar Solar",
    status: "active",
    rating: "4.6",
    location: { city: "Adelaide", state: "SA" },
    customers: 71,
    pipeline: "$3.1M",
    installsMtd: 15,
    conversion: "28.3%",
    conversionDelta: "-0.5%",
    revenue: "$3.1M",
    revenueDelta: "+9%",
    avatarClass: "master-avatar-warm-border",
  },
  {
    id: "ew",
    initials: "EW",
    name: "EcoWatt Installs",
    status: "active",
    rating: "4.5",
    location: { city: "Perth", state: "WA" },
    customers: 65,
    pipeline: "$2.9M",
    installsMtd: 14,
    conversion: "27.1%",
    conversionDelta: "+2.2%",
    revenue: "$2.9M",
    revenueDelta: "+12%",
    avatarClass: "master-avatar-amber-funnel",
  },
  {
    id: "pe",
    initials: "PE",
    name: "PureEnergy Co",
    status: "active",
    rating: "4.7",
    location: { city: "Gold Coast", state: "QLD" },
    customers: 61,
    pipeline: "$2.7M",
    installsMtd: 13,
    conversion: "26.9%",
    conversionDelta: "+1.6%",
    revenue: "$2.7M",
    revenueDelta: "+8%",
    avatarClass: "master-avatar-navy",
  },
  {
    id: "se",
    initials: "SE",
    name: "SolarEdge AU",
    status: "pending",
    rating: "4.4",
    location: { city: "Canberra", state: "NSW" },
    customers: 58,
    pipeline: "$2.5M",
    installsMtd: 12,
    conversion: "25.8%",
    conversionDelta: "+0.9%",
    revenue: "$2.5M",
    revenueDelta: "+6%",
    avatarClass: "master-avatar-slate",
  },
  {
    id: "ph",
    initials: "PH",
    name: "PowerHouse Solar",
    status: "suspended",
    rating: "4.2",
    location: { city: "Hobart", state: "VIC" },
    customers: 52,
    pipeline: "$2.3M",
    installsMtd: 10,
    conversion: "24.5%",
    conversionDelta: "-1.2%",
    revenue: "$2.3M",
    revenueDelta: "+3%",
    avatarClass: "master-avatar-orange-2",
  },
];

/** Expanded installer row — customer table (Figma 3:14925) */
export type MasterInstallerCustomerStage =
  | "Completed"
  | "Negotiation"
  | "Closed Won"
  | "Site Visit";

export type MasterInstallerCustomer = {
  id: string;
  initials: string;
  name: string;
  email: string;
  phone: string;
  systemSize: string;
  stage: MasterInstallerCustomerStage;
  price: string;
  address: string;
  date: string;
};

export type MasterInstallerDetail = {
  phone: string;
  email: string;
  websiteLabel: string;
  websiteHref: string;
};

export const MASTER_INSTALLER_EXPAND_ACTIONS = {
  viewPortal: "View Full Portal",
  pipelineStats: "Pipeline Stats",
  viewAllCustomers: "View All Customers",
} as const;

export const MASTER_INSTALLER_DETAILS: Record<string, MasterInstallerDetail> = {
  sm: {
    phone: "02 9876 5432",
    email: "admin@solarmax.com.au",
    websiteLabel: "solarmax.com.au",
    websiteHref: "https://solarmax.com.au",
  },
  gg: {
    phone: "03 9123 4500",
    email: "contact@greengridenergy.com.au",
    websiteLabel: "greengridenergy.com.au",
    websiteHref: "https://greengridenergy.com.au",
  },
  sp: {
    phone: "07 3344 8899",
    email: "support@sunpeak.au",
    websiteLabel: "sunpeak.au",
    websiteHref: "https://sunpeak.au",
  },
  bs: {
    phone: "08 8455 1100",
    email: "hello@brightstarsolar.au",
    websiteLabel: "brightstarsolar.au",
    websiteHref: "https://brightstarsolar.au",
  },
  ew: {
    phone: "08 9555 2200",
    email: "office@ecowattinstalls.au",
    websiteLabel: "ecowattinstalls.au",
    websiteHref: "https://ecowattinstalls.au",
  },
  pe: {
    phone: "07 5566 3300",
    email: "team@pureenergy.au",
    websiteLabel: "pureenergy.au",
    websiteHref: "https://pureenergy.au",
  },
  se: {
    phone: "02 6110 7700",
    email: "sales@solaredge.au",
    websiteLabel: "solaredge.au",
    websiteHref: "https://solaredge.au",
  },
  ph: {
    phone: "03 7000 8800",
    email: "accounts@powerhousesolar.au",
    websiteLabel: "powerhousesolar.au",
    websiteHref: "https://powerhousesolar.au",
  },
};

export const MASTER_INSTALLER_CUSTOMERS: Record<
  string,
  MasterInstallerCustomer[]
> = {
  sm: [
    {
      id: "sm-c1",
      initials: "JW",
      name: "James Wilson",
      email: "james.wilson@email.com",
      phone: "0467742723",
      systemSize: "6.6kW",
      stage: "Completed",
      price: "$22,000",
      address: "153 Chatswood Rd",
      date: "2026-01-25",
    },
    {
      id: "sm-c2",
      initials: "ET",
      name: "Emma Thompson",
      email: "emma.thompson@email.com",
      phone: "0479082544",
      systemSize: "8.8kW",
      stage: "Completed",
      price: "$16,800",
      address: "18 Ryde Rd",
      date: "2026-03-04",
    },
    {
      id: "sm-c3",
      initials: "LN",
      name: "Liam Nguyen",
      email: "liam.nguyen@email.com",
      phone: "0464512637",
      systemSize: "8.8kW",
      stage: "Negotiation",
      price: "$14,500",
      address: "116 Chatswood Rd",
      date: "2026-03-23",
    },
    {
      id: "sm-c4",
      initials: "OM",
      name: "Olivia Martinez",
      email: "olivia.martinez@email.com",
      phone: "0454575049",
      systemSize: "20kW",
      stage: "Negotiation",
      price: "$12,400",
      address: "50 Surry Hills Rd",
      date: "2026-01-12",
    },
    {
      id: "sm-c5",
      initials: "NA",
      name: "Noah Anderson",
      email: "noah.anderson@email.com",
      phone: "0433859372",
      systemSize: "8.8kW",
      stage: "Closed Won",
      price: "$19,200",
      address: "22 Manly Rd",
      date: "2026-03-27",
    },
    {
      id: "sm-c6",
      initials: "AR",
      name: "Ava Robinson",
      email: "ava.robinson@email.com",
      phone: "0473704694",
      systemSize: "13.2kW",
      stage: "Closed Won",
      price: "$19,200",
      address: "96 Chatswood Rd",
      date: "2026-01-10",
    },
    {
      id: "sm-c7",
      initials: "ML",
      name: "Mason Lee",
      email: "mason.lee@email.com",
      phone: "0428902566",
      systemSize: "20kW",
      stage: "Closed Won",
      price: "$8,500",
      address: "103 Bondi Rd",
      date: "2026-02-02",
    },
    {
      id: "sm-c8",
      initials: "SW",
      name: "Sophia Walker",
      email: "sophia.walker@email.com",
      phone: "0486354773",
      systemSize: "13.2kW",
      stage: "Negotiation",
      price: "$22,000",
      address: "77 Parramatta Rd",
      date: "2026-03-11",
    },
    {
      id: "sm-c9",
      initials: "EH",
      name: "Ethan Harris",
      email: "ethan.harris@email.com",
      phone: "0412970841",
      systemSize: "6.6kW",
      stage: "Completed",
      price: "$16,800",
      address: "58 Penrith Rd",
      date: "2026-02-24",
    },
    {
      id: "sm-c10",
      initials: "IC",
      name: "Isabella Clark",
      email: "isabella.clark@email.com",
      phone: "0472923016",
      systemSize: "20kW",
      stage: "Site Visit",
      price: "$22,000",
      address: "159 Liverpool Rd",
      date: "2026-01-20",
    },
    {
      id: "sm-c11",
      initials: "LY",
      name: "Lucas Young",
      email: "lucas.young@email.com",
      phone: "0431923544",
      systemSize: "15kW",
      stage: "Completed",
      price: "$14,500",
      address: "135 Surry Hills Rd",
      date: "2026-02-19",
    },
    {
      id: "sm-c12",
      initials: "MK",
      name: "Mia King",
      email: "mia.king@email.com",
      phone: "0466487674",
      systemSize: "10kW",
      stage: "Completed",
      price: "$12,400",
      address: "122 Surry Hills Rd",
      date: "2026-03-04",
    },
  ],
  gg: [
    {
      id: "gg-c1",
      initials: "TC",
      name: "Tom Chen",
      email: "tom.chen@email.com",
      phone: "0411223344",
      systemSize: "10kW",
      stage: "Negotiation",
      price: "$18,200",
      address: "22 Collins St",
      date: "2026-02-11",
    },
    {
      id: "gg-c2",
      initials: "RK",
      name: "Rachel Kim",
      email: "rachel.kim@email.com",
      phone: "0422334455",
      systemSize: "8.8kW",
      stage: "Completed",
      price: "$15,400",
      address: "9 Fitzroy St",
      date: "2026-01-18",
    },
    {
      id: "gg-c3",
      initials: "DP",
      name: "Daniel Park",
      email: "daniel.park@email.com",
      phone: "0433445566",
      systemSize: "13.2kW",
      stage: "Closed Won",
      price: "$21,000",
      address: "41 Richmond Rd",
      date: "2026-03-02",
    },
    {
      id: "gg-c4",
      initials: "SL",
      name: "Sarah Lee",
      email: "sarah.lee@email.com",
      phone: "0444556677",
      systemSize: "6.6kW",
      stage: "Site Visit",
      price: "$12,900",
      address: "5 Bridge Rd",
      date: "2026-03-20",
    },
  ],
  sp: [
    {
      id: "sp-c1",
      initials: "AH",
      name: "Andrew Hughes",
      email: "andrew.h@email.com",
      phone: "0455667788",
      systemSize: "20kW",
      stage: "Negotiation",
      price: "$24,500",
      address: "88 Queen St",
      date: "2026-02-05",
    },
    {
      id: "sp-c2",
      initials: "KW",
      name: "Kate Wong",
      email: "kate.wong@email.com",
      phone: "0466778899",
      systemSize: "10kW",
      stage: "Completed",
      price: "$17,800",
      address: "15 Logan Rd",
      date: "2026-01-29",
    },
    {
      id: "sp-c3",
      initials: "JB",
      name: "Josh Brown",
      email: "josh.brown@email.com",
      phone: "0477889900",
      systemSize: "8.8kW",
      stage: "Closed Won",
      price: "$14,200",
      address: "30 Wickham St",
      date: "2026-03-08",
    },
    {
      id: "sp-c4",
      initials: "NP",
      name: "Nina Patel",
      email: "nina.patel@email.com",
      phone: "0488990011",
      systemSize: "13.2kW",
      stage: "Site Visit",
      price: "$19,600",
      address: "12 Gregory Tce",
      date: "2026-03-25",
    },
  ],
  bs: [
    {
      id: "bs-c1",
      initials: "GW",
      name: "Grace White",
      email: "grace.white@email.com",
      phone: "0499001122",
      systemSize: "8.8kW",
      stage: "Completed",
      price: "$16,400",
      address: "44 King William St",
      date: "2026-02-14",
    },
    {
      id: "bs-c2",
      initials: "HM",
      name: "Harry Mills",
      email: "harry.mills@email.com",
      phone: "0410112233",
      systemSize: "6.6kW",
      stage: "Negotiation",
      price: "$13,800",
      address: "7 Jetty Rd",
      date: "2026-03-12",
    },
    {
      id: "bs-c3",
      initials: "VB",
      name: "Victoria Blake",
      email: "v.blake@email.com",
      phone: "0421223344",
      systemSize: "15kW",
      stage: "Closed Won",
      price: "$20,300",
      address: "18 Unley Rd",
      date: "2026-01-22",
    },
    {
      id: "bs-c4",
      initials: "CF",
      name: "Chris Ford",
      email: "chris.ford@email.com",
      phone: "0432334455",
      systemSize: "20kW",
      stage: "Site Visit",
      price: "$23,100",
      address: "3 Glen Osmond Rd",
      date: "2026-03-18",
    },
  ],
  ew: [
    {
      id: "ew-c1",
      initials: "ZT",
      name: "Zoe Taylor",
      email: "zoe.taylor@email.com",
      phone: "0443445566",
      systemSize: "10kW",
      stage: "Negotiation",
      price: "$17,200",
      address: "200 St Georges Tce",
      date: "2026-02-08",
    },
    {
      id: "ew-c2",
      initials: "PB",
      name: "Peter Barnes",
      email: "peter.barnes@email.com",
      phone: "0454556677",
      systemSize: "8.8kW",
      stage: "Completed",
      price: "$15,900",
      address: "66 Scarborough Beach Rd",
      date: "2026-01-30",
    },
    {
      id: "ew-c3",
      initials: "LW",
      name: "Laura West",
      email: "laura.west@email.com",
      phone: "0465667788",
      systemSize: "13.2kW",
      stage: "Closed Won",
      price: "$18,700",
      address: "14 Hay St",
      date: "2026-03-06",
    },
    {
      id: "ew-c4",
      initials: "DJ",
      name: "David Jones",
      email: "david.jones@email.com",
      phone: "0476778899",
      systemSize: "6.6kW",
      stage: "Site Visit",
      price: "$12,400",
      address: "9 Oxford St",
      date: "2026-03-22",
    },
  ],
  pe: [
    {
      id: "pe-c1",
      initials: "AF",
      name: "Amy Foster",
      email: "amy.foster@email.com",
      phone: "0487889900",
      systemSize: "20kW",
      stage: "Negotiation",
      price: "$22,800",
      address: "55 Cavill Ave",
      date: "2026-02-01",
    },
    {
      id: "pe-c2",
      initials: "RG",
      name: "Ryan Gibson",
      email: "ryan.gibson@email.com",
      phone: "0498990011",
      systemSize: "10kW",
      stage: "Completed",
      price: "$16,600",
      address: "12 Palm Beach Ave",
      date: "2026-01-17",
    },
    {
      id: "pe-c3",
      initials: "HC",
      name: "Hannah Cox",
      email: "hannah.cox@email.com",
      phone: "0419001122",
      systemSize: "8.8kW",
      stage: "Closed Won",
      price: "$14,900",
      address: "8 Kirra Rd",
      date: "2026-03-09",
    },
    {
      id: "pe-c4",
      initials: "MW",
      name: "Marcus Webb",
      email: "marcus.webb@email.com",
      phone: "0420112233",
      systemSize: "13.2kW",
      stage: "Site Visit",
      price: "$19,400",
      address: "27 Broadbeach Blvd",
      date: "2026-03-24",
    },
  ],
  se: [
    {
      id: "se-c1",
      initials: "LB",
      name: "Luke Bennett",
      email: "luke.bennett@email.com",
      phone: "0431223344",
      systemSize: "10kW",
      stage: "Negotiation",
      price: "$17,500",
      address: "5 Constitution Ave",
      date: "2026-02-16",
    },
    {
      id: "se-c2",
      initials: "GD",
      name: "Georgia Dean",
      email: "georgia.dean@email.com",
      phone: "0442334455",
      systemSize: "8.8kW",
      stage: "Site Visit",
      price: "$14,100",
      address: "14 Northbourne Ave",
      date: "2026-03-14",
    },
    {
      id: "se-c3",
      initials: "TK",
      name: "Tim Kelly",
      email: "tim.kelly@email.com",
      phone: "0453445566",
      systemSize: "6.6kW",
      stage: "Completed",
      price: "$13,200",
      address: "22 Civic Pl",
      date: "2026-01-26",
    },
    {
      id: "se-c4",
      initials: "SN",
      name: "Steph Ng",
      email: "steph.ng@email.com",
      phone: "0464556677",
      systemSize: "15kW",
      stage: "Closed Won",
      price: "$20,600",
      address: "40 London Circuit",
      date: "2026-03-03",
    },
  ],
  ph: [
    {
      id: "ph-c1",
      initials: "JR",
      name: "Jack Reed",
      email: "jack.reed@email.com",
      phone: "0475667788",
      systemSize: "8.8kW",
      stage: "Negotiation",
      price: "$15,300",
      address: "11 Sandy Bay Rd",
      date: "2026-02-20",
    },
    {
      id: "ph-c2",
      initials: "MS",
      name: "Mel Scott",
      email: "mel.scott@email.com",
      phone: "0486778899",
      systemSize: "10kW",
      stage: "Site Visit",
      price: "$16,900",
      address: "6 Battery Point",
      date: "2026-03-17",
    },
    {
      id: "ph-c3",
      initials: "BF",
      name: "Ben Fox",
      email: "ben.fox@email.com",
      phone: "0497889900",
      systemSize: "13.2kW",
      stage: "Completed",
      price: "$18,400",
      address: "19 Elizabeth St",
      date: "2026-01-13",
    },
    {
      id: "ph-c4",
      initials: "CO",
      name: "Chloe O'Neil",
      email: "chloe.oneil@email.com",
      phone: "0408990011",
      systemSize: "6.6kW",
      stage: "Closed Won",
      price: "$12,800",
      address: "3 Davey St",
      date: "2026-03-29",
    },
  ],
};

/** Products & Pricing (Figma 3:14281) */
export const MASTER_PRODUCTS_PRICING_PAGE = {
  title: "Products & Pricing",
  subtitle:
    "Manage wholesale prices, special deals, and installer tiers",
} as const;

export const MASTER_PRODUCTS_L1_TABS = [
  { id: "catalog", label: "Product Catalog", icon: "Package" as const },
  { id: "special", label: "Special Pricing", icon: "Dollar" as const },
  { id: "tiers", label: "Installer Tiers", icon: "Users" as const },
] as const;

/** Master — Invoices (Figma 3:16747) */
export const MASTER_INVOICES_PAGE = {
  title: "Invoices",
  subtitle:
    "Manage customer and internal invoices across all installers",
} as const;

export const MASTER_INVOICES_CREATE_LABEL = "Create Invoice" as const;

export const MASTER_INVOICES_SEARCH_PLACEHOLDER = "Search invoices..." as const;

export const MASTER_INVOICE_STAT_CARDS = [
  {
    id: "total",
    label: "Total Invoices",
    icon: "FileText" as const,
    value: "8",
  },
  {
    id: "pending",
    label: "Pending",
    icon: "Clock" as const,
    value: "$61.6K",
    footnote: "3 invoices",
  },
  {
    id: "paid",
    label: "Paid",
    icon: "CheckCircle" as const,
    value: "$51.1K",
    footnote: "3 invoices",
  },
  {
    id: "overdue",
    label: "Overdue",
    icon: "AlertTriangle" as const,
    value: "$9.6K",
    footnote: "1 invoices",
  },
] as const;

export type MasterInvoiceTypeTabId = "all" | "customer" | "internal";

export const MASTER_INVOICE_TYPE_TABS = [
  { id: "all" as const, label: "All", icon: "FileText" as const },
  { id: "customer" as const, label: "Customer", icon: "User" as const },
  { id: "internal" as const, label: "Internal", icon: "Building2" as const },
] as const;

export type MasterInvoiceRowStatus = "draft" | "sent" | "paid" | "overdue";

export type MasterInvoiceStatusFilterId = "all" | MasterInvoiceRowStatus;

export const MASTER_INVOICE_STATUS_FILTERS = [
  { id: "all" as const, label: "All" },
  { id: "draft" as const, label: "Draft" },
  { id: "sent" as const, label: "Sent" },
  { id: "paid" as const, label: "Paid" },
  { id: "overdue" as const, label: "Overdue" },
] as const;

export type MasterInvoiceKind = "internal" | "customer";

export type MasterInvoiceActionId = "check" | "send" | "eye" | "trash";

export type MasterInvoiceToAvatarTone = "navy" | "warm";

export type MasterInvoiceRow = {
  id: string;
  invoiceNumber: string;
  kind: MasterInvoiceKind;
  fromName: string;
  to: {
    initials: string;
    name: string;
    avatarTone: MasterInvoiceToAvatarTone;
  };
  issueDate: string;
  dueDate: string;
  total: string;
  status: MasterInvoiceRowStatus;
  actions: MasterInvoiceActionId[];
};

export const MASTER_INVOICE_TABLE_COLUMNS = [
  { id: "invoice", label: "Invoice #", align: "left" as const },
  { id: "type", label: "Type", align: "left" as const },
  { id: "from", label: "From", align: "left" as const },
  { id: "to", label: "To", align: "left" as const },
  { id: "date", label: "Date", align: "left" as const },
  { id: "due", label: "Due Date", align: "left" as const },
  { id: "total", label: "Total", align: "right" as const },
  { id: "status", label: "Status", align: "center" as const },
  { id: "actions", label: "Actions", align: "center" as const },
] as const;

export const MASTER_INVOICE_ROWS: MasterInvoiceRow[] = [
  {
    id: "1",
    invoiceNumber: "INV-2026-001",
    kind: "internal",
    fromName: "Easylink HQ",
    to: { initials: "SP", name: "SolarMax Pro", avatarTone: "navy" },
    issueDate: "2026-02-15",
    dueDate: "2026-03-15",
    total: "$17,149",
    status: "sent",
    actions: ["check", "eye", "trash"],
  },
  {
    id: "2",
    invoiceNumber: "INV-2026-002",
    kind: "customer",
    fromName: "SolarMax Pro",
    to: { initials: "ES", name: "Ethan Salvi", avatarTone: "warm" },
    issueDate: "2026-02-10",
    dueDate: "2026-03-10",
    total: "$15,950",
    status: "paid",
    actions: ["eye", "trash"],
  },
  {
    id: "3",
    invoiceNumber: "INV-2026-003",
    kind: "internal",
    fromName: "Easylink HQ",
    to: { initials: "GE", name: "GreenGrid Energy", avatarTone: "navy" },
    issueDate: "2026-01-20",
    dueDate: "2026-02-20",
    total: "$9,636",
    status: "overdue",
    actions: ["check", "eye", "trash"],
  },
  {
    id: "4",
    invoiceNumber: "INV-2026-004",
    kind: "customer",
    fromName: "GreenGrid Energy",
    to: { initials: "MC", name: "Marcus Chen", avatarTone: "warm" },
    issueDate: "2026-02-28",
    dueDate: "2026-03-28",
    total: "$27,610",
    status: "sent",
    actions: ["check", "eye", "trash"],
  },
  {
    id: "5",
    invoiceNumber: "INV-2026-005",
    kind: "internal",
    fromName: "Easylink HQ",
    to: { initials: "SS", name: "SunPeak Solutions", avatarTone: "navy" },
    issueDate: "2026-02-05",
    dueDate: "2026-03-05",
    total: "$8,206",
    status: "paid",
    actions: ["eye", "trash"],
  },
  {
    id: "6",
    invoiceNumber: "INV-2026-006",
    kind: "customer",
    fromName: "BrightStar Solar",
    to: { initials: "SJ", name: "Sarah Johnson", avatarTone: "warm" },
    issueDate: "2026-03-01",
    dueDate: "2026-03-31",
    total: "$22,000",
    status: "draft",
    actions: ["send", "eye", "trash"],
  },
  {
    id: "7",
    invoiceNumber: "INV-2026-007",
    kind: "internal",
    fromName: "Easylink HQ",
    to: { initials: "EI", name: "EcoWatt Installs", avatarTone: "navy" },
    issueDate: "2026-03-01",
    dueDate: "2026-03-31",
    total: "$16,852",
    status: "sent",
    actions: ["check", "eye", "trash"],
  },
  {
    id: "8",
    invoiceNumber: "INV-2026-008",
    kind: "customer",
    fromName: "SolarMax Pro",
    to: { initials: "DP", name: "David Park", avatarTone: "warm" },
    issueDate: "2026-01-15",
    dueDate: "2026-02-15",
    total: "$26,950",
    status: "paid",
    actions: ["eye", "trash"],
  },
];

export type MasterProductCategoryId =
  | "all"
  | "panels"
  | "inverters"
  | "batteries"
  | "racking"
  | "equipment";

export const MASTER_PRODUCT_CATEGORIES: {
  id: MasterProductCategoryId;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "panels", label: "Panels" },
  { id: "inverters", label: "Inverters" },
  { id: "batteries", label: "Batteries" },
  { id: "racking", label: "Racking" },
  { id: "equipment", label: "Equipment" },
];

export type MasterProductRowIcon =
  | "Sun"
  | "Cpu"
  | "Battery"
  | "Wrench"
  | "Package";

export type MasterProductCatalogRow = {
  id: string;
  category: Exclude<MasterProductCategoryId, "all">;
  name: string;
  subtitle: string;
  sku: string;
  brand: string;
  retail: string;
  wholesale: string;
  margin: string;
  rowIcon: MasterProductRowIcon;
};

export const MASTER_PRODUCT_CATALOG_ROWS: MasterProductCatalogRow[] = [
  {
    id: "p1",
    category: "panels",
    name: "LONGi Hi-MO 6 450W",
    subtitle: "Panels · per panel",
    sku: "LG-HM6-450",
    brand: "LONGi",
    retail: "$285",
    wholesale: "$195",
    margin: "31.6%",
    rowIcon: "Sun",
  },
  {
    id: "p2",
    category: "panels",
    name: "Jinko Tiger Neo 440W",
    subtitle: "Panels · per panel",
    sku: "JK-TN-440",
    brand: "Jinko",
    retail: "$265",
    wholesale: "$180",
    margin: "32.1%",
    rowIcon: "Sun",
  },
  {
    id: "p3",
    category: "panels",
    name: "Canadian Solar 455W",
    subtitle: "Panels · per panel",
    sku: "CS-455-HiDM",
    brand: "Canadian Solar",
    retail: "$275",
    wholesale: "$188",
    margin: "31.6%",
    rowIcon: "Sun",
  },
  {
    id: "p4",
    category: "panels",
    name: "Trina Vertex S+ 445W",
    subtitle: "Panels · per panel",
    sku: "TR-VS445",
    brand: "Trina",
    retail: "$270",
    wholesale: "$185",
    margin: "31.5%",
    rowIcon: "Sun",
  },
  {
    id: "i1",
    category: "inverters",
    name: "Fronius Primo GEN24 5kW",
    subtitle: "Inverters · per unit",
    sku: "FR-P24-5",
    brand: "Fronius",
    retail: "$2,450",
    wholesale: "$1,890",
    margin: "22.9%",
    rowIcon: "Cpu",
  },
  {
    id: "i2",
    category: "inverters",
    name: "SolarEdge SE5000H",
    subtitle: "Inverters · per unit",
    sku: "SE-5000H",
    brand: "SolarEdge",
    retail: "$2,200",
    wholesale: "$1,680",
    margin: "23.6%",
    rowIcon: "Cpu",
  },
  {
    id: "i3",
    category: "inverters",
    name: "Enphase IQ8+ Micro",
    subtitle: "Inverters · per unit",
    sku: "EN-IQ8P",
    brand: "Enphase",
    retail: "$265",
    wholesale: "$198",
    margin: "25.3%",
    rowIcon: "Cpu",
  },
  {
    id: "i4",
    category: "inverters",
    name: "Sungrow SG5.0RS",
    subtitle: "Inverters · per unit",
    sku: "SG-5RS",
    brand: "Sungrow",
    retail: "$1,350",
    wholesale: "$980",
    margin: "27.4%",
    rowIcon: "Cpu",
  },
  {
    id: "b1",
    category: "batteries",
    name: "Tesla Powerwall 3",
    subtitle: "Batteries · per unit",
    sku: "TP-PW3",
    brand: "Tesla",
    retail: "$12,500",
    wholesale: "$9,800",
    margin: "21.6%",
    rowIcon: "Battery",
  },
  {
    id: "b2",
    category: "batteries",
    name: "BYD HVS 10.2kWh",
    subtitle: "Batteries · per unit",
    sku: "BYD-HVS102",
    brand: "BYD",
    retail: "$8,900",
    wholesale: "$6,800",
    margin: "23.6%",
    rowIcon: "Battery",
  },
  {
    id: "b3",
    category: "batteries",
    name: "Enphase IQ Battery 10T",
    subtitle: "Batteries · per unit",
    sku: "EN-IQB10T",
    brand: "Enphase",
    retail: "$9,200",
    wholesale: "$7,100",
    margin: "22.8%",
    rowIcon: "Battery",
  },
  {
    id: "r1",
    category: "racking",
    name: "K2 D-Dome Flat Roof",
    subtitle: "Racking · per set",
    sku: "K2-DDOME",
    brand: "K2 Systems",
    retail: "$85",
    wholesale: "$58",
    margin: "31.8%",
    rowIcon: "Wrench",
  },
  {
    id: "r2",
    category: "racking",
    name: "Clenergy TinRoof Kit",
    subtitle: "Racking · per set",
    sku: "CL-TRK",
    brand: "Clenergy",
    retail: "$45",
    wholesale: "$32",
    margin: "28.9%",
    rowIcon: "Wrench",
  },
  {
    id: "e1",
    category: "equipment",
    name: "DC Isolator 1000V",
    subtitle: "Equipment · per unit",
    sku: "DCI-1000V",
    brand: "Generic",
    retail: "$42",
    wholesale: "$28",
    margin: "33.3%",
    rowIcon: "Package",
  },
  {
    id: "e2",
    category: "equipment",
    name: "MC4 Connector Pair",
    subtitle: "Equipment · per pair",
    sku: "MC4-PAIR",
    brand: "Generic",
    retail: "$8",
    wholesale: "$4.5",
    margin: "43.8%",
    rowIcon: "Package",
  },
];

export const MASTER_PRODUCT_TABLE_COLUMNS = [
  { id: "product", label: "Product", align: "left" as const },
  { id: "sku", label: "SKU", align: "left" as const },
  { id: "brand", label: "Brand", align: "left" as const },
  { id: "retail", label: "Retail Price", align: "right" as const },
  { id: "wholesale", label: "Wholesale Price", align: "right" as const },
  { id: "margin", label: "Margin", align: "right" as const },
  { id: "actions", label: "Actions", align: "right" as const },
] as const;

export const MASTER_PRODUCT_SEARCH_PLACEHOLDER = "Search products..." as const;
export const MASTER_PRODUCT_ADD_LABEL = "Add Product" as const;

/** Special Pricing tab (Figma 3:16372) */
export const MASTER_SPECIAL_PRICING_INTRO =
  "Set custom wholesale prices for specific installers. These override the default wholesale price." as const;

export const MASTER_SPECIAL_PRICING_ADD_LABEL = "Add Special Price" as const;

export const MASTER_SPECIAL_PRICING_TABLE_COLUMNS = [
  { id: "installer", label: "Installer", align: "left" as const },
  { id: "product", label: "Product", align: "left" as const },
  { id: "wholesale", label: "Wholesale Price", align: "right" as const },
  { id: "special", label: "Special Price", align: "right" as const },
  { id: "discount", label: "Discount", align: "right" as const },
  { id: "validUntil", label: "Valid Until", align: "left" as const },
  { id: "actions", label: "Actions", align: "center" as const },
] as const;

export type MasterSpecialPricingRow = {
  id: string;
  installerName: string;
  installerInitials: string;
  productName: string;
  wholesale: string;
  specialPrice: string;
  discount: string;
  validUntil: string;
};

export const MASTER_SPECIAL_PRICING_ROWS: MasterSpecialPricingRow[] = [
  {
    id: "sp1",
    installerName: "SolarMax Pro",
    installerInitials: "SP",
    productName: "LONGi Hi-MO 6 450W",
    wholesale: "$195",
    specialPrice: "$175",
    discount: "-10.3%",
    validUntil: "2026-06-30",
  },
  {
    id: "sp2",
    installerName: "SolarMax Pro",
    installerInitials: "SP",
    productName: "Tesla Powerwall 3",
    wholesale: "$9,800",
    specialPrice: "$9,200",
    discount: "-6.1%",
    validUntil: "2026-06-30",
  },
  {
    id: "sp3",
    installerName: "GreenGrid Energy",
    installerInitials: "GE",
    productName: "Fronius Primo GEN24 5kW",
    wholesale: "$1,890",
    specialPrice: "$1,750",
    discount: "-7.4%",
    validUntil: "2026-05-15",
  },
  {
    id: "sp4",
    installerName: "SunPeak Solutions",
    installerInitials: "SS",
    productName: "Jinko Tiger Neo 440W",
    wholesale: "$180",
    specialPrice: "$165",
    discount: "-8.3%",
    validUntil: "2026-04-30",
  },
];

/** Installer Tiers tab — monthly (Figma 3:17265) & yearly (Figma 3:17632) */
export type MasterInstallerTierBilling = "monthly" | "yearly";

export const MASTER_INSTALLER_TIER_BILLING_OPTIONS = [
  { id: "monthly" as const, label: "Monthly" },
  { id: "yearly" as const, label: "Yearly" },
] as const;

export const MASTER_INSTALLER_TIERS_YEARLY_SAVE_LABEL = "Save 20%" as const;

export const MASTER_INSTALLER_TIER_VOLUME_LABELS = [
  "30",
  "60",
  "120",
  "500",
  "2K",
  "5K",
  "10K",
] as const;

export const MASTER_INSTALLER_TIER_STANDARD_CARD = {
  title: "Standard",
  tagline: "Core tools to capture and convert leads",
  planSubtitle: "Standard",
  priceSuffix: "/Month",
} as const;

export const MASTER_INSTALLER_TIER_PRO_CARD = {
  title: "PRO",
  tagline: "Advanced tools to maximize lead quality and business growth.",
  planSubtitle: "Standard PRO",
  priceSuffix: "/Month",
  mostPopularLabel: "Most Popular",
  upgradeLabel: "Upgrade",
} as const;

export const MASTER_INSTALLER_TIER_STANDARD_FEATURES = [
  "120 measurements/month",
  "AI roof measurements and solar potential analysis",
  "Access to built-in CRM",
  "Leads export to CSV",
  "Lead conversion analytics",
  "Unlimited SunnyForms",
  "Unlimited websites integrations",
  "Full SunnyForm customization",
  "AI Datasheet Reader",
  "Multilingual SunnyForms",
  "Real-time appointment bookings",
  "Access to pro tips",
  "Email notifications",
] as const;

export type MasterInstallerTierProFeature = {
  label: string;
  multiline?: boolean;
};

export const MASTER_INSTALLER_TIER_PRO_FEATURES: MasterInstallerTierProFeature[] =
  [
    { label: "500 measurements/month" },
    { label: "Everything in Standard, plus:" },
    { label: "Remove Solarise logo in SunnyForms" },
    { label: "Advanced lead verification" },
    {
      label:
        "Integrations with 3rd-party tools (CRMs, Zapier, project management tools, solar design, automation, marketing platforms, etc.)",
      multiline: true,
    },
    { label: "Email and WhatsApp notifications" },
    { label: "Dedicated support manager" },
  ];

export type MasterInstallerTiersPricing = {
  standardPrice: string;
  proPrice: string;
  standardSliderFillPct: number;
  proSliderFillPct: number;
  standardActiveVolumeLabel: string;
  proActiveVolumeLabel: string;
};

export const MASTER_INSTALLER_TIERS_PRICING: Record<
  MasterInstallerTierBilling,
  MasterInstallerTiersPricing
> = {
  monthly: {
    standardPrice: "$717",
    proPrice: "$1797",
    standardSliderFillPct: 33.333,
    proSliderFillPct: 50,
    standardActiveVolumeLabel: "120",
    proActiveVolumeLabel: "500",
  },
  yearly: {
    standardPrice: "$574",
    proPrice: "$1438",
    standardSliderFillPct: 33.333,
    proSliderFillPct: 50,
    standardActiveVolumeLabel: "120",
    proActiveVolumeLabel: "500",
  },
};

export type MasterKpiIconName =
  | "Dollar"
  | "Building2"
  | "Users"
  | "Zap"
  | "TrendingUp"
  | "BarChart3";

export type MasterKpiTint = "navy" | "orange";

export type MasterDashboardKpi = {
  id: string;
  label: string;
  value: string;
  delta: string;
  footnote: string;
  icon: MasterKpiIconName;
  tint: MasterKpiTint;
};

export const MASTER_DASHBOARD_KPIS: MasterDashboardKpi[] = [
  {
    id: "pipeline-value",
    label: "Total Pipeline Value",
    value: "$48.2M",
    delta: "+18.6%",
    footnote: "Across 20 installers",
    icon: "Dollar",
    tint: "navy",
  },
  {
    id: "active-installers",
    label: "Active Installers",
    value: "20",
    delta: "+3",
    footnote: "4 joined this quarter",
    icon: "Building2",
    tint: "orange",
  },
  {
    id: "total-customers",
    label: "Total Customers",
    value: "1,247",
    delta: "+142",
    footnote: "Across all portals",
    icon: "Users",
    tint: "navy",
  },
  {
    id: "installs-mtd",
    label: "Total Installs MTD",
    value: "312",
    delta: "+67",
    footnote: "15.6 avg per installer",
    icon: "Zap",
    tint: "orange",
  },
  {
    id: "conversion",
    label: "Avg. Conversion Rate",
    value: "31.4%",
    delta: "+4.1%",
    footnote: "Platform-wide",
    icon: "TrendingUp",
    tint: "navy",
  },
  {
    id: "revenue-month",
    label: "Revenue This Month",
    value: "$4.8M",
    delta: "+22.3%",
    footnote: "vs $3.92M last month",
    icon: "BarChart3",
    tint: "orange",
  },
];

export const MASTER_REVENUE_TREND = {
  title: "Platform Revenue Trend",
  totalLabel: "$31.5M",
  totalHint: "9-month total",
  months: [
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
    "Jan",
    "Feb",
    "Mar",
  ] as const,
  /** Values in millions (USD) for spline chart */
  valuesMillions: [2.2, 2.6, 3.0, 3.5, 4.0, 4.4, 4.9, 5.4, 5.8] as const,
} as const;

export type MasterDashboardInvoiceMetric = {
  id: string;
  label: string;
  countLabel: string;
  amount: string;
  icon: "Clock" | "Dollar" | "Target";
  /** 0–1 portion of track filled (Figma proportions) */
  progress: number;
  progressClass: "master-invoice-pending" | "master-invoice-paid" | "master-invoice-overdue";
};

export const MASTER_DASHBOARD_INVOICE_METRICS: MasterDashboardInvoiceMetric[] = [
  {
    id: "pending",
    label: "Pending Invoices",
    countLabel: "147 invoices",
    amount: "$892K",
    icon: "Clock",
    progress: 0.32,
    progressClass: "master-invoice-pending",
  },
  {
    id: "paid",
    label: "Paid This Month",
    countLabel: "312 invoices",
    amount: "$3.2M",
    icon: "Dollar",
    progress: 0.72,
    progressClass: "master-invoice-paid",
  },
  {
    id: "overdue",
    label: "Overdue",
    countLabel: "23 invoices",
    amount: "$156K",
    icon: "Target",
    progress: 0.08,
    progressClass: "master-invoice-overdue",
  },
];

export type MasterTopInstaller = {
  rank: number;
  name: string;
  revenue: string;
  clientsLabel: string;
  initials: string;
  avatarClass:
    | "master-avatar-yellow"
    | "master-avatar-orange"
    | "master-avatar-slate"
    | "master-avatar-warm-border"
    | "master-avatar-amber-funnel"
    | "master-avatar-navy"
    | "master-avatar-orange-2";
  /** 0–1 relative bar vs #1 */
  volumeRatio: number;
};

export const MASTER_TOP_INSTALLERS: MasterTopInstaller[] = [
  {
    rank: 1,
    name: "SolarMax Pro",
    revenue: "$4.2M",
    clientsLabel: "98 clients",
    initials: "SM",
    avatarClass: "master-avatar-yellow",
    volumeRatio: 1,
  },
  {
    rank: 2,
    name: "GreenGrid Energy",
    revenue: "$3.8M",
    clientsLabel: "87 clients",
    initials: "GG",
    avatarClass: "master-avatar-orange",
    volumeRatio: 0.9,
  },
  {
    rank: 3,
    name: "SunPeak Solutions",
    revenue: "$3.4M",
    clientsLabel: "76 clients",
    initials: "SP",
    avatarClass: "master-avatar-slate",
    volumeRatio: 0.81,
  },
  {
    rank: 4,
    name: "BrightStar Solar",
    revenue: "$3.1M",
    clientsLabel: "71 clients",
    initials: "BS",
    avatarClass: "master-avatar-warm-border",
    volumeRatio: 0.74,
  },
  {
    rank: 5,
    name: "EcoWatt Installs",
    revenue: "$2.9M",
    clientsLabel: "65 clients",
    initials: "EW",
    avatarClass: "master-avatar-amber-funnel",
    volumeRatio: 0.69,
  },
  {
    rank: 6,
    name: "PureEnergy Co",
    revenue: "$2.7M",
    clientsLabel: "61 clients",
    initials: "PE",
    avatarClass: "master-avatar-navy",
    volumeRatio: 0.64,
  },
  {
    rank: 7,
    name: "SolarEdge AU",
    revenue: "$2.5M",
    clientsLabel: "58 clients",
    initials: "SE",
    avatarClass: "master-avatar-slate",
    volumeRatio: 0.6,
  },
  {
    rank: 8,
    name: "PowerHouse Solar",
    revenue: "$2.3M",
    clientsLabel: "52 clients",
    initials: "PH",
    avatarClass: "master-avatar-orange-2",
    volumeRatio: 0.55,
  },
];

export type MasterFunnelStage = {
  id: string;
  label: string;
  value: number;
  barClass:
    | "master-funnel-leads"
    | "master-funnel-site"
    | "master-funnel-proposal"
    | "master-funnel-negotiation"
    | "master-funnel-won";
};

export const MASTER_FUNNEL_STAGES: MasterFunnelStage[] = [
  { id: "leads", label: "Leads", value: 2400, barClass: "master-funnel-leads" },
  {
    id: "site",
    label: "Site Visit",
    value: 1700,
    barClass: "master-funnel-site",
  },
  {
    id: "proposal",
    label: "Proposal",
    value: 1240,
    barClass: "master-funnel-proposal",
  },
  {
    id: "negotiation",
    label: "Negotiation",
    value: 760,
    barClass: "master-funnel-negotiation",
  },
  {
    id: "won",
    label: "Closed Won",
    value: 360,
    barClass: "master-funnel-won",
  },
];

export type MasterRegionSlice = {
  id: string;
  label: string;
  percent: number;
  swatchClass:
    | "master-region-nsw"
    | "master-region-vic"
    | "master-region-qld"
    | "master-region-sa"
    | "master-region-wa";
};

export const MASTER_REGION_SLICES: MasterRegionSlice[] = [
  { id: "nsw", label: "NSW", percent: 35, swatchClass: "master-region-nsw" },
  { id: "vic", label: "VIC", percent: 28, swatchClass: "master-region-vic" },
  { id: "qld", label: "QLD", percent: 20, swatchClass: "master-region-qld" },
  { id: "sa", label: "SA", percent: 10, swatchClass: "master-region-sa" },
  { id: "wa", label: "WA", percent: 7, swatchClass: "master-region-wa" },
];

/** Installer landing — Lead marketplace (Figma Final Designs 3:2206) */
export type InstallerLeadMarketplaceBadgeVariant = "cyan" | "yellow";

export type InstallerLeadMarketplaceCard = {
  id: string;
  badge: string;
  badgeVariant: InstallerLeadMarketplaceBadgeVariant;
  title: string;
  system: string;
  panels: string;
  battery: string;
  inverter: string;
  city: string;
  buildingType: string;
  price: string;
  postcode?: string;
};

export const INSTALLER_LEAD_MARKETPLACE_SECTION = {
  heading: "Lead Marketplace",
  filterByLabel: "Filter by:",
  filters: {
    buildingType: "Building Type",
    systemType: "System Type",
    city: "City",
    postcode: "Lead Postcode",
  },
  filterAllLabel: "All",
  signUpCta: "Sign Up to Buy",
  signUpHref: "/installers/auth",
  apiFallbackNotice:
    "Showing sample leads while we connect to the marketplace.",
} as const;

/** Used when the public leads API is unreachable (offline / misconfigured). */
export const INSTALLER_LEAD_MARKETPLACE_FALLBACK: InstallerLeadMarketplaceCard[] =
  [
    {
      id: "fallback-melbourne",
      badge: "RESIDENTIAL",
      badgeVariant: "cyan",
      title: "Lead from Melbourne",
      system: "6.6kW System",
      panels: "16 Panels",
      battery: "No",
      inverter: "Yes",
      city: "Melbourne",
      buildingType: "Brick House",
      price: "$16,000",
      postcode: "3000",
    },
    {
      id: "fallback-sydney",
      badge: "RESIDENTIAL",
      badgeVariant: "yellow",
      title: "Lead from Sydney",
      system: "10kW System",
      panels: "24 Panels",
      battery: "Yes",
      inverter: "Yes",
      city: "Sydney",
      buildingType: "Tile Roof",
      price: "$45,000",
      postcode: "2000",
    },
    {
      id: "fallback-brisbane",
      badge: "COMMERCIAL",
      badgeVariant: "cyan",
      title: "Lead from Brisbane",
      system: "30kW System",
      panels: "72 Panels",
      battery: "Yes",
      inverter: "Yes",
      city: "Brisbane",
      buildingType: "Warehouse",
      price: "$52,000",
      postcode: "4000",
    },
    {
      id: "fallback-perth",
      badge: "RESIDENTIAL",
      badgeVariant: "cyan",
      title: "Lead from Perth",
      system: "8kW System",
      panels: "20 Panels",
      battery: "No",
      inverter: "Yes",
      city: "Perth",
      buildingType: "New Build",
      price: "$50,000",
      postcode: "6000",
    },
  ];

/** Installer schedule dashboard */
export const INSTALLER_SCHEDULE_VIEW_MODES = [
  "month",
  "week",
  "day",
  "agenda",
] as const;

export const INSTALLER_SCHEDULE_DEFAULTS = {
  appointmentsPage: 1,
  appointmentsLimit: 100,
  createDurationMs: 60 * 60 * 1000,
  calendarHeightPx: 620,
} as const;

/** Landing footer columns — labels + routes */
export type LandingFooterLink = {
  label: string;
  href: string;
};

export type LandingFooterColumn = {
  title: string;
  items: LandingFooterLink[];
};

export const LANDING_FOOTER_COLUMNS: LandingFooterColumn[] = [
  {
    title: "Products",
    items: [
      { label: "EP2000", href: "/bluetti" },
      { label: "EP760", href: "#" },
      { label: "BLUETTI Elite 30 V2", href: "#" },
      { label: "Solar Panels", href: "#" },
      { label: "Accessories", href: "#" },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "How it works", href: "/how-it-works" },
      { label: "FAQs", href: "/faqs" },
      { label: "Warranty", href: "/warranty" },
      { label: "Contact Us", href: "/contact-us" },
      { label: "User Manual", href: "/user-manual" },
      { label: "Firmware", href: "/firmware" },
    ],
  },
  {
    title: "Company",
    items: [
      { label: "About Us", href: "/about-us" },
      { label: "Web Design & Development", href: "/services" },
      { label: "Careers", href: "#" },
      { label: "Projects", href: "#" },
      { label: "Partners", href: "#" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Legal",
    items: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Cookie Policy", href: "#" },
    ],
  },
];

/** Shared hero-style CTA block (footer + firmware page) */
export const LANDING_ENERGY_CTA = {
  title: "Ready to Take Control of Your Energy?",
  description:
    "Join thousands of homeowners already saving with EasyLink Solar and BLUETTI products.",
  primary: { label: "Get Your Quote", href: "/designs" },
  secondary: { label: "Contact Sales", href: "/contact-us" },
} as const;

/** Public User Manual page (`/user-manual`) */
export type UserManualBlock =
  | { type: "paragraph"; text: string }
  | { type: "list_intro"; text: string }
  | { type: "bullet_list"; items: readonly string[] };

export const USER_MANUAL_PAGE = {
  title: "User Manual",
  blocks: [
    {
      type: "paragraph",
      text: "All systems are designed to operate automatically under normal conditions.",
    },
    {
      type: "paragraph",
      text: "Basic components include solar panels, inverters, battery packs (if applicable), and monitoring systems.",
    },
    {
      type: "list_intro",
      text: "For safe and efficient use:",
    },
    {
      type: "bullet_list",
      items: [
        "Keep panels clean and free from dust or debris",
        "Avoid any physical damage or obstruction to the system",
        "Do not attempt to repair or modify any components",
      ],
    },
    {
      type: "paragraph",
      text: "Each product comes with its own data sheet and documentation, which will be provided by the company at the time of installation.",
    },
    {
      type: "paragraph",
      text: "For detailed instructions and specifications, please refer to the respective manufacturer's manual or website.",
    },
  ],
} as const;

/** Public Warranty page (`/warranty`) */
export const WARRANTY_PAGE = {
  title: "Warranty",
  paragraphs: [
    "All warranties are provided and covered by the respective manufacturers of the products supplied.",
    "Customers are advised to refer to the manufacturer's warranty terms and conditions for detailed coverage.",
    "For any warranty-related queries or claims, please contact the respective manufacturer directly or reach out to our support team for assistance in connecting with the concerned company.",
  ],
} as const;

/** Public Blog listing page (`/blog`, Figma Final Designs 1:4095) */
export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  dateLabel: string;
  authorName: string;
  authorAvatarSrc: string;
  authorAvatarAlt: string;
  heroImageSrc: string;
  heroImageAlt: string;
  thumbnailImageSrc: string;
  thumbnailImageAlt: string;
  href: string;
};

/** Shared hero backdrop for blog cards (Figma 1:4222 top panel) */
export const BLOG_CARD_HERO_IMAGE = {
  src: "/images/home/blog-card-bg.png",
  alt: "Solar grid graphic background",
} as const;

export const BLOG_PAGE = {
  hero: {
    title: "Our Blog",
    subtitle:
      "Latest news, technologies, and guides from the world of renewable energy.",
  },
  posts: [
    {
      id: "blog-1",
      slug: "maximizing-solar-output-1",
      title: "Maximizing Solar Output",
      excerpt:
        "Key strategies for positioning and maintaining your solar panels to ensure peak energy production year-round.",
      category: "Installation",
      dateLabel: "16 Sep",
      authorName: "Charlie Baker",
      authorAvatarSrc: "/images/logo.webp",
      authorAvatarAlt: "Charlie Baker",
      heroImageSrc: BLOG_CARD_HERO_IMAGE.src,
      heroImageAlt: BLOG_CARD_HERO_IMAGE.alt,
      thumbnailImageSrc: "/images/home/solar-panel-design.png",
      thumbnailImageAlt: "Solar panels on a residential rooftop at sunset",
      href: "#",
    },
    {
      id: "blog-2",
      slug: "maximizing-solar-output-2",
      title: "Maximizing Solar Output",
      excerpt:
        "Key strategies for positioning and maintaining your solar panels to ensure peak energy production year-round.",
      category: "Installation",
      dateLabel: "12 Sep",
      authorName: "Charlie Baker",
      authorAvatarSrc: "/images/logo.webp",
      authorAvatarAlt: "Charlie Baker",
      heroImageSrc: BLOG_CARD_HERO_IMAGE.src,
      heroImageAlt: BLOG_CARD_HERO_IMAGE.alt,
      thumbnailImageSrc: "/images/home/solar-panel-design-2.png",
      thumbnailImageAlt: "Technician inspecting solar array installation",
      href: "#",
    },
    {
      id: "blog-3",
      slug: "maximizing-solar-output-3",
      title: "Maximizing Solar Output",
      excerpt:
        "Key strategies for positioning and maintaining your solar panels to ensure peak energy production year-round.",
      category: "Installation",
      dateLabel: "05 Sep",
      authorName: "Charlie Baker",
      authorAvatarSrc: "/images/logo.webp",
      authorAvatarAlt: "Charlie Baker",
      heroImageSrc: BLOG_CARD_HERO_IMAGE.src,
      heroImageAlt: BLOG_CARD_HERO_IMAGE.alt,
      thumbnailImageSrc: "/images/home/solar-panel-design-3.png",
      thumbnailImageAlt: "Home battery and inverter system in a utility room",
      href: "#",
    },
    {
      id: "blog-4",
      slug: "maximizing-solar-output-4",
      title: "Maximizing Solar Output",
      excerpt:
        "Key strategies for positioning and maintaining your solar panels to ensure peak energy production year-round.",
      category: "Installation",
      dateLabel: "28 Aug",
      authorName: "Charlie Baker",
      authorAvatarSrc: "/images/logo.webp",
      authorAvatarAlt: "Charlie Baker",
      heroImageSrc: BLOG_CARD_HERO_IMAGE.src,
      heroImageAlt: BLOG_CARD_HERO_IMAGE.alt,
      thumbnailImageSrc:
        "/images/ep2000/69fed828eb99db6c54cd35d6_EP2000_BN-1_2.png",
      thumbnailImageAlt: "Modern home with rooftop solar and battery storage",
      href: "#",
    },
    {
      id: "blog-5",
      slug: "maximizing-solar-output-5",
      title: "Maximizing Solar Output",
      excerpt:
        "Key strategies for positioning and maintaining your solar panels to ensure peak energy production year-round.",
      category: "Installation",
      dateLabel: "21 Aug",
      authorName: "Charlie Baker",
      authorAvatarSrc: "/images/logo.webp",
      authorAvatarAlt: "Charlie Baker",
      heroImageSrc: BLOG_CARD_HERO_IMAGE.src,
      heroImageAlt: BLOG_CARD_HERO_IMAGE.alt,
      thumbnailImageSrc:
        "/images/ep2000/69fee5f674d0dbc73ac1a248_37451_2x_efee59fb-8810-43fb-b358-f422086bf8aa.webp",
      thumbnailImageAlt: "BLUETTI home battery stack beside solar equipment",
      href: "#",
    },
    {
      id: "blog-6",
      slug: "maximizing-solar-output-6",
      title: "Maximizing Solar Output",
      excerpt:
        "Key strategies for positioning and maintaining your solar panels to ensure peak energy production year-round.",
      category: "Installation",
      dateLabel: "14 Aug",
      authorName: "Charlie Baker",
      authorAvatarSrc: "/images/logo.webp",
      authorAvatarAlt: "Charlie Baker",
      heroImageSrc: BLOG_CARD_HERO_IMAGE.src,
      heroImageAlt: BLOG_CARD_HERO_IMAGE.alt,
      thumbnailImageSrc:
        "/images/ep2000/69fee6e8c1734fecd47b9a7a_2x_4dec8179-4b1a-45b3-a965-153a88e92f02.webp",
      thumbnailImageAlt: "Expanded battery modules for whole-home backup",
      href: "#",
    },
    {
      id: "blog-7",
      slug: "maximizing-solar-output-7",
      title: "Maximizing Solar Output",
      excerpt:
        "Key strategies for positioning and maintaining your solar panels to ensure peak energy production year-round.",
      category: "Installation",
      dateLabel: "07 Aug",
      authorName: "Charlie Baker",
      authorAvatarSrc: "/images/logo.webp",
      authorAvatarAlt: "Charlie Baker",
      heroImageSrc: BLOG_CARD_HERO_IMAGE.src,
      heroImageAlt: BLOG_CARD_HERO_IMAGE.alt,
      thumbnailImageSrc:
        "/images/ep2000/69feeb2df6a1e8f116354f89_37420_2x-2.webp",
      thumbnailImageAlt: "Whole-home power system with high inverter efficiency",
      href: "#",
    },
    {
      id: "blog-8",
      slug: "maximizing-solar-output-8",
      title: "Maximizing Solar Output",
      excerpt:
        "Key strategies for positioning and maintaining your solar panels to ensure peak energy production year-round.",
      category: "Installation",
      dateLabel: "31 Jul",
      authorName: "Charlie Baker",
      authorAvatarSrc: "/images/logo.webp",
      authorAvatarAlt: "Charlie Baker",
      heroImageSrc: BLOG_CARD_HERO_IMAGE.src,
      heroImageAlt: BLOG_CARD_HERO_IMAGE.alt,
      thumbnailImageSrc:
        "/images/ep2000/69feeb7b2311bfbc123c8fb5_37435_2x_2001628c-7deb-44c3-8d89-6fe4a35f5619.webp",
      thumbnailImageAlt: "Large solar array supported by home energy storage",
      href: "#",
    },
    {
      id: "blog-9",
      slug: "maximizing-solar-output-9",
      title: "Maximizing Solar Output",
      excerpt:
        "Key strategies for positioning and maintaining your solar panels to ensure peak energy production year-round.",
      category: "Installation",
      dateLabel: "24 Jul",
      authorName: "Charlie Baker",
      authorAvatarSrc: "/images/logo.webp",
      authorAvatarAlt: "Charlie Baker",
      heroImageSrc: BLOG_CARD_HERO_IMAGE.src,
      heroImageAlt: BLOG_CARD_HERO_IMAGE.alt,
      thumbnailImageSrc:
        "/images/ep2000/69feeb48fd693f54b1540a2f_37419_2x_7c64035d-bf03-4905-a232-8423cf4d1276.webp",
      thumbnailImageAlt: "Energy independence setup with modular battery design",
      href: "#",
    },
  ],
} as const;

/** Blog inner page route (`/blog/[blogid]/details`, Figma Final Designs 1:4551) */
export function getBlogPostDetailHref(blogId: string): string {
  return `/blog/${blogId}/details`;
}

export function getBlogPostById(blogId: string): BlogPost | undefined {
  return BLOG_PAGE.posts.find((post) => post.id === blogId);
}

export function getRelatedBlogPosts(
  blogId: string,
  limit = 3,
): readonly BlogPost[] {
  return BLOG_PAGE.posts.filter((post) => post.id !== blogId).slice(0, limit);
}

export type BlogDetailLeaderQuote = {
  paragraphs: readonly string[];
  attribution: string;
};

export type BlogDetailContact = {
  heading: string;
  name: string;
  role: string;
  phone: string;
  emailLabel: string;
  emailHref: string;
};

export type BlogDetailFeaturedQuote = {
  quote: string;
  name: string;
  role: string;
  avatarSrc: string;
  avatarAlt: string;
};

export type BlogDetailContent = {
  breadcrumbTitle: string;
  categoryLabel: string;
  dateLabel: string;
  readTimeLabel: string;
  title: string;
  attributionName: string;
  attributionRole: string;
  leadParagraph: string;
  featuredImageSrc: string;
  featuredImageAlt: string;
  bodyParagraphs: readonly string[];
  featuredQuote: BlogDetailFeaturedQuote;
  industryLeadersHeading: string;
  leaderQuotes: readonly BlogDetailLeaderQuote[];
  contact: BlogDetailContact;
  shareLabel: string;
  relatedHeading: string;
  relatedSubtitle: string;
  relatedViewAllHref: string;
  relatedViewAllLabel: string;
};

export const BLOG_DETAIL_DEFAULT: BlogDetailContent = {
  breadcrumbTitle: "Australia's 2035 Energy Path",
  categoryLabel: "Industry News",
  dateLabel: "18 Sep 2025",
  readTimeLabel: "8 min read",
  title:
    "Wind, solar, hydro and storage powering Australia's path to 2035",
  attributionName: "Clean Energy Council",
  attributionRole: "Media Release",
  leadParagraph:
    "The Clean Energy Council welcomes today's announcement by the Federal Government and Climate Change Authority in setting Australia's next emissions reduction target. These targets are essential to give investors and communities the confidence that Australia is serious about delivering on its climate commitments.",
  featuredImageSrc: "/images/home/solar-panel-design.png",
  featuredImageAlt: "Solar panels installed on a residential rooftop",
  bodyParagraphs: [
    "The electricity sector has already done much of the heavy lifting, abating around one-third of its projected emissions over the past decade through the rollout of renewable energy projects. This transformation is proof that clean energy is not only cutting pollution but also driving a jobs and investment boom across regional Australia.",
    "Australia's clean energy industry is absolutely committed to achieving the nation's renewable energy goals by 2035. The transformation already underway shows what's possible: in just eight years, Australia has more than doubled the amount of renewable energy in the system, from 17 per cent renewables in 2017 to just over 40 per cent in 2025. With critical mass now within reach, every new project makes the next one faster and easier, unlocking momentum that will accelerate Australia's clean energy build-out.",
    "The world is building renewables at an extraordinary pace. In April of this year, China added as much solar as Australia has in its entire history and, with global supply chains now delivering wind and solar at scale, the technology is cheaper and more accessible than ever.",
    "The clean energy industry is fully committed to doing its part to meet this new target. Renewable energy, backed by firming and storage, is delivering clean, reliable and affordable power for Australian families and businesses. At the same time, the sector is creating tens of thousands of jobs, strengthening regional economies, and attracting tens of billions of dollars in private capital.",
    "Today's decision sets the direction for the next chapter of Australia's energy transformation. With clear targets and the right policy settings, we can accelerate the shift to a modern energy system, continue to cut emissions, and ensure Australian workers, businesses and communities share in the benefits of the transition.",
  ],
  featuredQuote: {
    quote:
      "We've done this before, and we can do it again. Australia has more than doubled the renewables in our energy system in less than a decade, and there's no reason we can't go the rest of the way.",
    name: "Brett Wickham",
    role: "Interim CEO, Clean Energy Council",
    avatarSrc: "/images/logo.webp",
    avatarAlt: "Brett Wickham",
  },
  industryLeadersHeading: "Industry Leaders Speak Out",
  leaderQuotes: [
    {
      paragraphs: [
        "The technology is proven, the investment is lined up, and the projects are ready for approval. This is absolutely achievable, if we stay the course. Every wind farm, every solar project, every big battery makes the next one easier. We're hitting critical mass now, and momentum is on our side.",
        "With clear policy settings, strong investor appetite and projects rolling out across the nation, we are confident the sector can deliver the next big leap and ensure Australia's energy future is clean, reliable and affordable.",
      ],
      attribution: "Brett Wickham, Interim CEO, CEC",
    },
    {
      paragraphs: [
        "Iberdrola Australia is committed to the energy transition, with billions of dollars already invested, combining our global expertise and local know-how to deliver onshore, offshore and transmission projects. We look forward to playing our part in achieving the emissions reduction targets in a way that maximises the benefits to all – particularly regional Australians whose communities host the clean energy infrastructure.",
      ],
      attribution: "Ross Rolfe AO, CEO, Iberdrola Australia",
    },
    {
      paragraphs: [
        "Potentia Energy has a strong pipeline across all major technologies and the backing of committed shareholders. We are fully focused on scaling up Australia's clean energy future — driving innovation, delivering projects, and ensuring reliable, affordable renewables power the nation forward.",
      ],
      attribution: "Werther Esposito, CEO, Potentia Energy",
    },
    {
      paragraphs: [
        "RES is committed to Australia's energy transition, with projects in solar, wind, and storage well underway. The skills, the supply chains, and the will are all there to make clean energy the backbone of our electricity system by 2035.",
      ],
      attribution: "Matt Rebeck, CEO, RES Australia",
    },
    {
      paragraphs: [
        "Achieving great things requires ambitious goals. Australia has the resources, people and policy to get the job done. Squadron Energy is ready to get on with the job of building the power system of the future by replacing ageing, high emissions coal generation with clean renewable energy.",
      ],
      attribution: "Rob Wheals, CEO, Squadron Energy",
    },
    {
      paragraphs: [
        "ACCIONA Energia has no doubt Australia can deliver one of the world's most ambitious clean energy transformations. The technology is proven, the projects are ready, and our teams are committed to making it happen.",
      ],
      attribution: "Gavin Reymond, Managing Director, ACCIONA Energia",
    },
    {
      paragraphs: [
        "The Australian Government's new climate target represents an important step toward a net zero future and sends a clear signal of intent about the role Australia can play in the global energy transition. The announcement provides confidence to industry about the Government's ambition for the renewable energy sector in Australia. While decarbonising the energy sector is an opportunity to drive innovation and boost local industry, it is important to remember strong collaboration across government, industry and communities will be required to meet the emissions goals.",
      ],
      attribution: "Jackie Brown, Country Chair, GE Vernova Australia",
    },
    {
      paragraphs: [
        "SolarEdge, a leading PV inverter manufacturer, has first-hand experience in witnessing the tremendous growth in the Australian distributed energy resources sector over the past 15 years. Having an ambitious target is an essential confidence-building mechanism for Australia and demonstrates serious climate commitment delivery. Clear targets and the right policy settings will accelerate the transition to a modern, digital energy system, decarbonise the energy sector, cut emissions, and ensure Australia shares the benefits of the transition. We wholeheartedly support today's decision that sets the direction for the next phase of Australia's energy evolution.",
      ],
      attribution:
        "James Sturch, Technical Director - International Markets, SolarEdge Technologies",
    },
    {
      paragraphs: [
        "As a pioneer in battery storage and virtual power plant solutions, Sonnen sees every day how households and businesses are proving that clean energy works. With batteries, solar, and smart energy systems in place, Australians are demonstrating that reliable and affordable clean power can be built from the ground up.",
      ],
      attribution: "Leo Kukarin, Head of Technical Operations, Sonnen Australia",
    },
    {
      paragraphs: [
        "Goldwind Australia strongly supports the government's emissions targets. We are focused on delivering innovative, competitive wind and BESS-integrated renewable projects that will help Australia reach them. We are turning world-class wind resources into clean and reliable power, while providing jobs and economic benefits to our regional communities.",
      ],
      attribution: "Ning Chen, Chief Executive Officer, Goldwind Australia",
    },
    {
      paragraphs: [
        "Atmos Renewables already manages more than 1.6GW of clean energy assets in Australia and we are here for the long haul. We have the people, systems and experience to operate at scale. We welcome the government's ambitious plans and look forward to doing our part to help achieve them.",
      ],
      attribution: "Nigel Baker, Chief Executive, Atmos Renewables",
    },
  ],
  contact: {
    heading: "For more information or to arrange an interview:",
    name: "Liam Straughan",
    role: "Clean Energy Council Media Officer",
    phone: "+61 409 470 683",
    emailLabel: "Email the media team",
    emailHref: "mailto:media@cleanenergycouncil.org.au",
  },
  shareLabel: "Share this article:",
  relatedHeading: "Latest Updates",
  relatedSubtitle: "More news from the renewable energy sector",
  relatedViewAllHref: "/blog",
  relatedViewAllLabel: "VIEW ALL POSTS",
};

export function getBlogDetailContent(blogId: string): BlogDetailContent | null {
  if (!getBlogPostById(blogId)) {
    return null;
  }
  return BLOG_DETAIL_DEFAULT;
}

/** Public firmware information page (`/firmware`) */
export const FIRMWARE_PAGE = {
  title: "Firmware",
  paragraphs: [
    "We continuously work with our manufacturing partners to ensure that your solar system operates efficiently and reliably.",
    "System updates and improvements are managed by the respective manufacturers and are designed to enhance performance, safety, and overall system efficiency.",
    "Most updates are carried out automatically or during routine maintenance, and do not require any action from the user.",
    "Each product may also have its own data sheet and documentation, which will be provided at the time of installation for your reference.",
    "For any update-related queries or assistance, please contact our support team or refer to the respective manufacturer's website.",
  ],
} as const;

/** Customer portal — Solar Maintenance AMC wizard (`/customers/solar-maintenance`, Figma 1676:378) */
export const SOLAR_MAINTENANCE_CONTRACT = {
  pageTitle: "Solar and Battery Annual Maintenance Contract",
  pageSubtitle: "Create New Agreement",
  steps: [
    { id: 1 as const, label: "Step 1: Details", tone: "active" as const },
    { id: 2 as const, label: "Step 2: Services", tone: "idle" as const },
    { id: 3 as const, label: "Step 3: Signatures", tone: "idle" as const },
  ],
  agreementDetailsLabel: "Agreement Details:",
  placeholders: {
    companyName: "Company Name",
    contractNumber: "e.g. AMC-2024-001",
    equipmentSize: "e.g. 10 kW",
    equipmentQty: "Qty",
    installationAddress: "Enter address",
    clientName: "Client Name",
    abn: "XX XXX XXX XXX",
    clientCompanyName: "Client Company Name",
  },
  labels: {
    contractNumber: "Contract Number:",
    equipmentCovered: "Equipment Covered:",
    installationLocation: "Installation Location:",
    client: "Client:",
    abn: "ABN/ACN:",
    date: "Date",
    companyNameRight: "Company Name:",
  },
  equipmentColumnHeaders: ["Type", "Size", "Qty", "Date Installed"] as const,
  equipmentRows: [
    { id: "panels" as const, typeLabel: "Panels" },
    { id: "inverter" as const, typeLabel: "Inverter" },
    { id: "battery" as const, typeLabel: "Battery" },
    { id: "accessories" as const, typeLabel: "Accessories" },
  ],
  buttons: {
    saveDraft: "Save Draft",
    continue: "Continue",
  },
} as const;

/** Solar Maintenance wizard — Step 2 Services (Figma 1676:558) */
export const SOLAR_MAINTENANCE_STEP2 = {
  subtitle: "Configure Services",
  contractTermLabel: "Contract Term:",
  initialTermSubLabel: "Initial Term",
  initialTermOptions: [
    { value: "12" as const, label: "12 month" },
    { value: "24" as const, label: "24 month" },
    { value: "36" as const, label: "36 month" },
  ],
  scheduledVisitsLabel: "Scheduled Annual Visits:",
  visitOptions: [
    { id: "visual" as const, label: "Visual/Structural Inspection" },
    { id: "electrical" as const, label: "Electrical Testing" },
    { id: "battery" as const, label: "Battery Maintenance" },
    { id: "panelWash" as const, label: "Panel Wash and Clean Up" },
  ],
  cleaningLabel: "Cleaning Services",
  cleaningOptions: [
    {
      value: "soft" as const,
      label: "Soft brushes, eco-friendly detergents, low pressure water",
    },
    {
      value: "standard" as const,
      label: "Standard pressure wash and biodegradable cleaner",
    },
    {
      value: "premium" as const,
      label: "Premium deep clean with de-ionised rinse",
    },
  ],
  serviceNotesLabel: "Service Notes",
  serviceNotesPlaceholder: "Specify Additional Services",
} as const;

/** Solar Maintenance wizard — Step 3 Signatures (Figma 1676:648) */
export const SOLAR_MAINTENANCE_STEP3 = {
  subtitle: "Sign and Finalize",
  providerNameLabel: "Provider Name",
  providerNamePlaceholder: "Provider Name",
  providerSignatureLabel: "Signature",
  providerSignaturePlaceholder: "Type to sign",
  uploadSignatureHint: "Upload signature image",
  providerDateLabel: "Date",
  clientSignatureLabel: "Client Signature",
  clientDateLabel: "Client Date",
  exhibitsLabel: "Exhibits/Attachments",
  exhibitUploadRowLabel: "Upload Files",
  exhibitUploadButton: "Upload Files",
  exhibitChecklist: [
    { id: "systemInventory" as const, label: "System Inventory/Photos" },
    {
      id: "maintenanceChecklist" as const,
      label: "Maintenance Checklist/Report Template",
    },
    { id: "insuranceCertificates" as const, label: "Insurance Certificates" },
    { id: "pricingSchedule" as const, label: "Pricing Schedule" },
  ],
  buttons: {
    saveDraft: "Save Draft",
    generateContract: "Generate Contract",
  },
  wizardNav: {
    backAria: "Previous step",
    closeAria: "Close and return to dashboard",
  },
} as const;

/** About Us page (`/about-us`, Figma Final Designs 1:4957) */
export const ABOUT_US_PAGE = {
  hero: {
    badge: "About Us",
    title: "Advanced Solar Panels for Modern Homes",
    subtitle:
      "Discover our range of high-performance solar panels designed to maximize efficiency and reliability for your solar energy system.",
    primaryCta: { label: "View Catalog", href: "/products" },
    secondaryCta: { label: "Get a Quote", href: "/contact-us" },
    slides: [
      {
        src: "/images/ep2000/69fed828eb99db6c54cd35d6_EP2000_BN-1_2.png",
        alt: "BLUETTI home battery and rooftop solar on a modern residence",
      },
      {
        src: "/images/about-us/mission-bg.png",
        alt: "Modern home with rooftop solar panels and electric vehicle charging",
      },
      {
        src: "/images/about-us/portfolio-thumb.png",
        alt: "Residential solar panel installation on a contemporary home",
      },
    ],
    features: [
      {
        iconId: "AboutUsHeroSun" as const,
        title: "Solar Generation",
        subtitle: "Harness the sun",
      },
      {
        iconId: "AboutUsHeroBolt" as const,
        title: "Smart Storage",
        subtitle: "EP760 & EP2000",
      },
      {
        iconId: "AboutUsHeroHome" as const,
        title: "Home Power",
        subtitle: "24/7 backup",
      },
      {
        iconId: "AboutUsHeroEv" as const,
        title: "EV Ready",
        subtitle: "Charge overnight",
      },
      {
        iconId: "AboutUsHeroShield" as const,
        title: "Dual Core Safety Guard",
        subtitle: "Advanced protection",
      },
    ],
  },
  mission: {
    vidoSrc: "/videos/aboutMission.mp4",
    videoAriaLabel:
      "Modern Australian home with rooftop solar and an electric vehicle",
    cards: [
      {
        title: "Our Mission",
        paragraphs: [
          "Making solar energy accessible and transparent for every Australian household through AI-powered solutions.",
          "Connecting customers with certified installers and premium equipment. Delivering instant, accurate quotes with 95% roof analysis precision.",
        ],
      },
      {
        title: "Why Choose Us",
        paragraphs: [
          "AI-driven platform with satellite imagery and machine learning technology.",
          "Consistent 5-star reviews and CEC-approved equipment.",
          "Transparent, no-pressure service with verified CEC Accrediated installer network.",
          "If you would like to remove your Energy Bills for good.",
        ],
      },
    ],
  },
  timeline: {
    events: [
      {
        id: "founding",
        side: "left" as const,
        bullets: [
          { highlight: true, text: "Founding 2016" },
          {
            text: "Founded in Sydney, Australia as a solar solutions provider",
          },
          {
            text: "Vision to make solar accessible for every Australian household",
          },
          {
            text: "Connecting customers, installers, and vendors seamlessly",
          },
          { text: "Servicing Sydney Customers since 2016." },
          {
            text: "Consistent Excellent Installation and Customer Service Reviews.",
          },
        ],
      },
      {
        id: "platform",
        side: "right" as const,
        bullets: [
          { text: "Platform Launch & AI Integration" },
          { text: "AI-driven quoting system using satellite imagery" },
          { text: "95% accurate roof analysis with machine learning" },
        ],
        badges: [
          { label: "95% accuracy", emphasis: false },
          { label: "2025 Integration", emphasis: false },
        ],
      },
      {
        id: "growth",
        side: "left" as const,
        title: "User Growth & Quote Generation",
        bullets: [
          {
            text: "Surpassed 1,000+ personalized solar quotes nationwide",
          },
          {
            text: "High-Return On Investment options for every customer segment.",
          },
        ],
        badges: [
          { label: "Certified", suffix: "Network", emphasis: true },
          { label: "VPP", suffix: "Coming", emphasis: true },
        ],
      },
      {
        id: "excellence",
        side: "right" as const,
        title: "Customer Excellence",
        sections: [
          {
            subtitle: "Ecosystem Expansion",
            bullets: [
              { text: "Verified network of certified solar installers" },
              { text: "Integrated CRM tools and marketing support" },
            ],
          },
          {
            bullets: [
              {
                text: "Consistent 5-star customer reviews and satisfaction",
              },
              { text: "Transparent, no-pressure service approach" },
            ],
          },
        ],
        badges: [
          { label: "5", suffix: "Rating", showStar: true, emphasis: true },
          {
            label: "CEC Approved",
            suffix: "Equipment",
            emphasis: true,
          },
        ],
      },
    ],
  },
  process: {
    backgroundImageSrc: "/images/about-us/mission-bg.png",
    backgroundImageAlt: "Solar network visualization background",
    title: "Our Customer First Solar Process",
    steps: [
      {
        title: "We Start by Truly Listening",
        body: "We begin every journey by actively listening to you — understanding your unique expectations, energy needs, household or business usage patterns, and any pain points with your current setup. This ensures we capture what matters most to you.",
      },
      {
        title: "Defining Shared Goals Together",
        body: "From there, we clearly define shared objectives and collaboratively design a tailored solar (and battery, if applicable) solution. We present realistic, transparent options that perfectly align with your budget, energy goals, roof suitability, and desired long-term outcomes — no high-pressure sales, just honest recommendations.",
      },
      {
        title: "Building Trust from Day One",
        body: "Our transparent, consultative approach establishes immediate trust and a genuine sense of shared responsibility. We're committed to achieving the best possible results for you, every step of the way.",
      },
      {
        title: "Backed by a Trusted Nationwide Network",
        body: "We partner exclusively with a nationwide network of fully accredited installers (accredited under the recognised Australian standards for solar quality and competence, previously managed by the Clean Energy Council and now by Solar Accreditation Australia). Every installer shares our strict customer-first ethos and core values of integrity, safety, and excellence.",
      },
      {
        title: "Delivering Outstanding Results",
        body: "The outcome? High-performing solar systems that consistently deliver maximum value, enhanced comfort, significant long-term energy savings, and reliable performance. Our satisfied customers frequently become enthusiastic advocates, referring family, friends, and their networks with confidence.",
      },
    ],
  },
  values: {
    backgroundImageSrc: "/images/about-us/values-bg.png",
    backgroundImageAlt: "Abstract connected energy network background",
    title: "Our Values",
    items: [
      { label: "Trusted Advisor", variant: "a" as const },
      { label: "Customer Focus", variant: "b" as const },
      {
        label: ["Customer", "Centric", "Excellence"],
        variant: "a" as const,
      },
      { label: ["Customer", "Satisfaction"], variant: "b" as const },
      { label: "Value Creation", variant: "a" as const },
      { label: "Quality", variant: "b" as const },
      { label: ["Price", "Transparency"], variant: "a" as const },
      { label: "Innovation", variant: "b" as const },
      { label: "Collaboration", variant: "a" as const },
      { label: "Team Efficiency", variant: "b" as const },
    ],
  },
  portfolio: {
    title: "Site Portfolio",
    subtitle: "More news from the renewable energy sector",
    items: [
      {
        id: "innovative-solar",
        slug: "innovative-solar-technology",
        title: "Innovative Solar Technology",
        excerpt:
          "Exploring the latest advancements in solar panel technology that enhance efficiency and reduce costs for consumers.",
        category: "Installation",
        dateLabel: "16 Sep",
        authorName: "Emily Johnson",
        authorAvatarSrc: "/images/logo.webp",
        authorAvatarAlt: "Emily Johnson",
        heroImageSrc: "/images/about-us/portfolio-thumb.png",
        heroImageAlt: "Rooftop solar installation on a residential property",
        thumbnailImageSrc: "/images/home/solar-panel-design.png",
        thumbnailImageAlt: "Rooftop solar installation on a residential property",
        href: "/blog/innovative-solar-technology",
      },
      {
        id: "sustainable-energy",
        slug: "sustainable-energy-solutions",
        title: "Sustainable Energy Solutions",
        excerpt:
          "Exploring the latest advancements in solar panel technology that enhance efficiency and reduce costs for consumers.",
        category: "Installation",
        dateLabel: "16 Sep",
        authorName: "Michael Smith",
        authorAvatarSrc: "/images/logo.webp",
        authorAvatarAlt: "Michael Smith",
        heroImageSrc: "/images/about-us/portfolio-thumb.png",
        heroImageAlt: "Sustainable energy system on a suburban home",
        thumbnailImageSrc: "/images/home/solar-panel-design.png",
        thumbnailImageAlt: "Sustainable energy system on a suburban home",
        href: "/blog/sustainable-energy-solutions",
      },
      {
        id: "solar-trends",
        slug: "solar-energy-trends",
        title: "Solar Energy Trends",
        excerpt:
          "Exploring the latest advancements in solar panel technology that enhance efficiency and reduce costs for consumers.",
        category: "Installation",
        dateLabel: "16 Sep",
        authorName: "Sarah Lee",
        authorAvatarSrc: "/images/about-us/avatar.jpg",
        authorAvatarAlt: "Sarah Lee",
        heroImageSrc: "/images/about-us/portfolio-thumb.png",
        heroImageAlt: "Solar array installation in progress",
        thumbnailImageSrc: "/images/home/solar-panel-design.png",
        thumbnailImageAlt: "Solar array installation in progress",
        href: "/blog/solar-energy-trends",
      },
      {
        id: "urban-solar",
        slug: "solar-innovations-for-urban-spaces",
        title: "Solar Innovations for Urban Spaces",
        excerpt:
          "Exploring the latest advancements in solar panel technology that enhance efficiency and reduce costs for consumers.",
        category: "Installation",
        dateLabel: "16 Sep",
        authorName: "Jessica Martinez",
        authorAvatarSrc: "/images/about-us/avatar.jpg",
        authorAvatarAlt: "Jessica Martinez",
        heroImageSrc: "/images/about-us/portfolio-thumb.png",
        heroImageAlt: "Urban rooftop solar project",
        thumbnailImageSrc: "/images/home/solar-panel-design.png",
        thumbnailImageAlt: "Urban rooftop solar project",
        href: "/blog/solar-innovations-for-urban-spaces",
      },
      {
        id: "economic-growth",
        slug: "solar-energy-and-economic-growth",
        title: "Solar Energy and Economic Growth",
        excerpt:
          "Exploring the latest advancements in solar panel technology that enhance efficiency and reduce costs for consumers.",
        category: "Installation",
        dateLabel: "16 Sep",
        authorName: "David Thompson",
        authorAvatarSrc: "/images/about-us/avatar.jpg",
        authorAvatarAlt: "David Thompson",
        heroImageSrc: "/images/about-us/portfolio-thumb.png",
        heroImageAlt: "Commercial solar deployment",
        thumbnailImageSrc: "/images/home/solar-panel-design.png",
        thumbnailImageAlt: "Commercial solar deployment",
        href: "/blog/solar-energy-and-economic-growth",
      },
      {
        id: "efficient-future",
        slug: "building-an-efficient-solar-future",
        title: "Building an Efficient Solar Future",
        excerpt:
          "Exploring the latest advancements in solar panel technology that enhance efficiency and reduce costs for consumers.",
        category: "Installation",
        dateLabel: "16 Sep",
        authorName: "Linda Chen",
        authorAvatarSrc: "/images/about-us/avatar.jpg",
        authorAvatarAlt: "Linda Chen",
        heroImageSrc: "/images/about-us/portfolio-thumb.png",
        heroImageAlt: "Efficient solar system on a new build home",
        thumbnailImageSrc: "/images/home/solar-panel-design.png",
        thumbnailImageAlt: "Efficient solar system on a new build home",
        href: "/blog/building-an-efficient-solar-future",
      },
      {
        id: "solar-storage",
        slug: "the-future-of-solar-storage",
        title: "The Future of Solar Storage",
        excerpt:
          "Exploring the latest advancements in solar panel technology that enhance efficiency and reduce costs for consumers.",
        category: "Installation",
        dateLabel: "16 Sep",
        authorName: "Brian Adams",
        authorAvatarSrc: "/images/about-us/avatar.jpg",
        authorAvatarAlt: "Brian Adams",
        heroImageSrc: "/images/about-us/portfolio-thumb.png",
        heroImageAlt: "Home battery and solar combination",
        thumbnailImageSrc: "/images/home/solar-panel-design.png",
        thumbnailImageAlt: "Home battery and solar combination",
        href: "/blog/the-future-of-solar-storage",
      },
      {
        id: "smart-homes",
        slug: "integrating-solar-into-smart-homes",
        title: "Integrating Solar into Smart Homes",
        excerpt:
          "Exploring the latest advancements in solar panel technology that enhance efficiency and reduce costs for consumers.",
        category: "Installation",
        dateLabel: "16 Sep",
        authorName: "Karen White",
        authorAvatarSrc: "/images/about-us/avatar.jpg",
        authorAvatarAlt: "Karen White",
        heroImageSrc: "/images/about-us/portfolio-thumb.png",
        heroImageAlt: "Smart home with integrated solar controls",
        thumbnailImageSrc: "/images/home/solar-panel-design.png",
        thumbnailImageAlt: "Smart home with integrated solar controls",
        href: "/blog/integrating-solar-into-smart-homes",
        },
        {
        id: "policy-adoption",
        slug: "the-role-of-policy-in-solar-adoption",
        title: "The Role of Policy in Solar Adoption",
        excerpt:
          "Exploring the latest advancements in solar panel technology that enhance efficiency and reduce costs for consumers.",
        category: "Installation",
        dateLabel: "16 Sep",
        authorName: "James Wilson",
        authorAvatarSrc: "/images/about-us/avatar.jpg",
        authorAvatarAlt: "James Wilson",
        heroImageSrc: "/images/about-us/portfolio-thumb.png",
        heroImageAlt: "Policy-driven residential solar rollout",
        thumbnailImageSrc: "/images/home/solar-panel-design.png",
        thumbnailImageAlt: "Policy-driven residential solar rollout",
        href: "/blog/the-role-of-policy-in-solar-adoption",
      },
    ],
  },
} as const;

export type AboutUsPortfolioItem =
  (typeof ABOUT_US_PAGE.portfolio.items)[number];

/** Public FAQs page (`/faqs`, Figma Final Designs 1:5645) */
export type FaqCategoryId =
  | "general"
  | "installation"
  | "rebates"
  | "products";

export type FaqItemVariant = "gold" | "blue";

export type FaqItem = {
  id: string;
  categoryId: FaqCategoryId;
  question: string;
  answer: string;
  variant: FaqItemVariant;
};

export const FAQS_PAGE = {
  hero: {
    badge: "Support Center",
    title: "How can we help you?",
    subtitle:
      "Find answers to common questions about solar energy, installation, pricing, and our services.",
    searchPlaceholder: "Search for answers...",
    heroImageSrc: "/images/faqs-hero.png",
    heroImageAlt: "Solar-powered EV charging hub at sunrise",
  },
  content: {
    backgroundImageSrc: "/images/faqs-bg.png",
    titleBanner: "Frequently Asked Questions",
    downloadLabel: "Download All FAQ",
    downloadHref: "/data/easylink-solar-faq.pdf",
  },
  categories: [
    {
      id: "general" as const,
      label: "General Questions",
      iconId: "FaqCategoryGeneral" as const,
    },
    {
      id: "installation" as const,
      label: "Installation & Process",
      iconId: "FaqCategoryInstallation" as const,
    },
    {
      id: "rebates" as const,
      label: "Rebates & Finances",
      iconId: "FaqCategoryRebates" as const,
    },
    {
      id: "products" as const,
      label: "Products & Battery",
      iconId: "FaqCategoryProducts" as const,
    },
  ],
  items: [
    {
      id: "ai-accuracy",
      categoryId: "general",
      question: "How will Easylink Solar improve AI accuracy and speed?",
      answer:
        "Our AI quoting engine uses satellite imagery and machine learning to analyse roof geometry, shading, and orientation. Continuous model updates and installer feedback loops improve quote accuracy toward 95% while reducing turnaround from days to minutes.",
      variant: "gold",
    },
    {
      id: "real-time-savings",
      categoryId: "general",
      question: "Will customers be able to track real-time solar savings?",
      answer:
        "Yes. The Easylink customer dashboard connects to your inverter and battery data so you can monitor generation, consumption, export, and estimated savings in near real time once your system is commissioned.",
      variant: "blue",
    },
    {
      id: "quote-process",
      categoryId: "general",
      question: "How does the online solar quote process work?",
      answer:
        "Enter your address, confirm roof details on the satellite map, choose your energy goals, and receive a tailored system recommendation with transparent pricing. A certified installer can then validate the design on site.",
      variant: "gold",
    },
    {
      id: "service-areas",
      categoryId: "general",
      question: "Which areas does Easylink Solar currently service?",
      answer:
        "We partner with certified installers across major Australian metro and regional markets. Enter your postcode during quoting to confirm installer availability in your area.",
      variant: "blue",
    },
    {
      id: "install-timeline",
      categoryId: "installation",
      question: "How long does a typical residential installation take?",
      answer:
        "Most single-phase residential installs are completed in one to two days once approvals and equipment are confirmed. Larger battery-backup systems may require an additional day for commissioning and testing.",
      variant: "gold",
    },
    {
      id: "install-requirements",
      categoryId: "installation",
      question: "What do I need to prepare before installation day?",
      answer:
        "Ensure clear roof access, an available switchboard location for the inverter, and someone on site to approve final placement. Your installer will confirm any structural or electrical prerequisites during the pre-install visit.",
      variant: "blue",
    },
    {
      id: "grid-connection",
      categoryId: "installation",
      question: "Who handles grid connection and meter upgrades?",
      answer:
        "Your installer coordinates distributor applications, meter programming, and compliance documentation. Timelines vary by network provider, and we keep you updated at each milestone.",
      variant: "gold",
    },
    {
      id: "stc-rebates",
      categoryId: "rebates",
      question: "Are government STC rebates included in my quote?",
      answer:
        "Eligible small-scale technology certificates are factored into your quote as an upfront discount where applicable. Final STC value depends on system size and the certificate price at contract signing.",
      variant: "blue",
    },
    {
      id: "finance-options",
      categoryId: "rebates",
      question: "What finance and payment options are available?",
      answer:
        "We support upfront purchase, green loans through partner lenders, and staged payment plans on selected packages. Your quote summary outlines all options before you commit.",
      variant: "gold",
    },
    {
      id: "payback-period",
      categoryId: "rebates",
      question: "What is the typical payback period for a home solar system?",
      answer:
        "Payback depends on system size, self-consumption, feed-in tariffs, and local sunlight. Many customers see strong returns within four to seven years, with higher savings when paired with battery storage.",
      variant: "blue",
    },
    {
      id: "bluetti-battery",
      categoryId: "products",
      question: "Which BLUETTI battery systems pair best with rooftop solar?",
      answer:
        "BLUETTI AC500 and AC300 modular stacks integrate with compatible hybrid inverters for whole-home backup. Your quote recommends capacity based on essential loads and overnight usage patterns.",
      variant: "gold",
    },
    {
      id: "battery-backup",
      categoryId: "products",
      question: "Can I add a battery to an existing solar installation?",
      answer:
        "In most cases, yes. A site assessment confirms inverter compatibility, switchboard capacity, and whether a hybrid upgrade or AC-coupled battery is the best fit for your home.",
      variant: "blue",
    },
    {
      id: "panel-warranty",
      categoryId: "products",
      question: "What warranty coverage comes with panels and inverters?",
      answer:
        "Product warranties are provided by manufacturers and vary by brand. Panels commonly include 25-year performance coverage; inverters and batteries typically carry 5–10 year warranties. See our Warranty page for claim guidance.",
      variant: "gold",
    },
    {
      id: "maintenance",
      categoryId: "products",
      question: "How often should solar panels be maintained?",
      answer:
        "Annual inspections help maintain output and safety. Easylink customers can enrol in a maintenance agreement for scheduled checks, cleaning recommendations, and performance reporting from the dashboard.",
      variant: "blue",
    },
  ],
  supportCta: {
    title: "Still have questions?",
    description:
      "Can't find the answer you're looking for? Our friendly team is here to help you with your solar journey.",
    primary: {
      label: "Contact Support",
      href: "/contact-us",
      iconId: "MessageSquare" as const,
    },
    secondary: {
      label: "1300 SOLAR LINK",
      href: "tel:1300765275",
      iconId: "Phone" as const,
    },
  },
} as const;

/** Customer portal — shared nav & page copy (Figma Final Designs 1725:*) */
export type CustomerPortalNavKey =
  | "dashboard"
  | "project"
  | "designs"
  | "maintenance"
  | "messages"
  | "products"
  | "payments"
  | "profile";

export const CUSTOMER_PORTAL = {
  title: "My Solar Portal",
  nav: [
    { href: "/customers/dashboard", label: "Dashboard", key: "dashboard" as const },
    { href: "/customers/project", label: "My Project", key: "project" as const },
    { href: "/customers/design", label: "My Design", key: "designs" as const },
    {
      href: "/customers/solar-maintenance",
      label: "Solar Maintenance",
      key: "maintenance" as const,
    },
    { href: "/customers/messages", label: "Messages", key: "messages" as const },
    { href: "/customers/products", label: "Products", key: "products" as const },
    { href: "/customers/payments", label: "Payments", key: "payments" as const },
    { href: "/customers/profile", label: "Profile", key: "profile" as const },
  ],
  dashboard: {
    welcome: {
      journeyPercent: 67,
      systemKw: "6.6 kW",
      savingsYr: "$1,840/yr",
      nextStep: "Installation",
    },
    kpis: [
      {
        id: "system-size",
        label: "System Size",
        value: "6.6 kW",
        sublabel: "16 panels",
        icon: "Light" as const,
        iconTintClass: "customer-kpi-icon-navy",
      },
      {
        id: "annual-output",
        label: "Annual Output",
        value: "9,636 kWh",
        sublabel: "projected",
        icon: "LightCheck" as const,
        iconTintClass: "customer-kpi-icon-orange",
      },
      {
        id: "est-savings",
        label: "Est. Savings",
        value: "$1,840/yr",
        sublabel: "per year",
        icon: "Dollar" as const,
        iconTintClass: "customer-kpi-icon-green",
      },
      {
        id: "total-price",
        label: "Total Price",
        value: "$8,500",
        sublabel: "inc. installation",
        icon: "Shop" as const,
        iconTintClass: "customer-kpi-icon-navy",
      },
    ],
    designOptions: [
      {
        id: "a",
        title: "Design A – Standard",
        badge: "approved" as const,
        kw: "6.6 kW",
        panels: "16 panels",
        price: "$8,500",
        savingsPerYr: "$1,840/yr",
        outputKwh: "9,636 kWh",
        imageSrc: "/images/home/customer-designA.jpg",
      },
      {
        id: "b",
        title: "Design B – Premium",
        badge: "draft" as const,
        kw: "10.0 kW",
        panels: "24 panels",
        price: "$18,200",
        savingsPerYr: "$2,950/yr",
        outputKwh: "14,600 kWh",
        imageSrc: "/images/home/customer-designB.jpg",
      },
      {
        id: "c",
        title: "Design C – Battery Add-on",
        badge: "draft" as const,
        kw: "6.6 kW",
        panels: "16 panels",
        price: "$19,800",
        savingsPerYr: "$2,580/yr",
        outputKwh: "9,636 kWh",
        imageSrc: "/images/home/customer-designA.jpg",
      },
      {
        id: "d",
        title: "Design D – Max Output",
        badge: "draft" as const,
        kw: "13.2 kW",
        panels: "32 panels",
        price: "$28,500",
        savingsPerYr: "$3,740/yr",
        outputKwh: "19,272 kWh",
        imageSrc: "/images/home/customer-designB.jpg",
      },
    ],
    timelineSteps: [
      { id: "t1", title: "Lead Created", dateLabel: "15 Jan 2026" },
      { id: "t2", title: "Site Visit Completed", dateLabel: "22 Jan 2026" },
      { id: "t3", title: "Design Approved", dateLabel: "28 Jan 2026" },
      { id: "t4", title: "Deposit Paid", dateLabel: "5 Feb 2026" },
      { id: "t5", title: "Installation Scheduled", dateLabel: "12 Mar 2026" },
      { id: "t6", title: "System Live", dateLabel: null },
    ],
    defaultTimelineActiveIndex: 4,
    installer: {
      initials: "SM",
      companyName: "SolarMax Pro",
      subtitle: "Verified Partner",
    },
  },
  products: {
    title: "Solar Products",
    subtitle: "Browse our range of certified solar equipment",
  },
} as const;

/** Marketing `/customers` — Solar Maintenance teaser section */
export const SOLAR_MAINTENANCE_CUSTOMER_SECTION = {
  eyebrow: "Care & performance",
  title: "Solar Maintenance",
  body:
    "Keep your panels, inverter, and battery performing year after year with an annual maintenance agreement you can manage from your customer dashboard.",
  ctaLabel: "Open maintenance agreement",
  ctaHref: "/customers/solar-maintenance",
} as const;

/**
 * Public Website Design & Development service page (`/services`).
 *
 * Copy is placeholder-grade but production-shaped: swap the strings here and the
 * whole page re-themes without touching a component.
 */
export const SERVICES_PAGE = {
  seo: {
    title:
      "Website Design & Development Services | Fast, SEO-Friendly Websites",
    description:
      "Professional website design and development that grows your business. We build fast, modern, SEO-friendly websites that increase traffic, generate leads, and improve customer trust.",
    keywords: [
      "website design",
      "web development",
      "ecommerce development",
      "WordPress development",
      "landing page design",
      "website redesign",
      "SEO friendly website",
    ],
    path: "/services",
    ogImageAlt:
      "Website Design & Development services — dashboard and landing page mockups",
  },
  breadcrumb: [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
    { label: "Website Design & Development", href: null },
  ],
  hero: {
    badge: "Website Design & Development",
    title: "Professional Website Design & Development That Grows Your Business",
    subtitle:
      "We build fast, modern, SEO-friendly websites that increase traffic, generate leads, and improve customer trust.",
    primaryCta: { label: "Get Free Quote", href: "/contact-us" },
    secondaryCta: { label: "View Portfolio", href: "#portfolio" },
    trustNote:
      "Free consultation. No obligation. Most quotes returned within one business day.",
    stats: [
      {
        id: "projects",
        value: 200,
        suffix: "+",
        label: "Projects",
        srLabel: "Over 200 projects delivered",
      },
      {
        id: "satisfaction",
        value: 98,
        suffix: "%",
        label: "Client Satisfaction",
        srLabel: "98 percent client satisfaction",
      },
      {
        id: "experience",
        value: 10,
        suffix: "+",
        label: "Years Experience",
        srLabel: "More than 10 years of experience",
      },
      {
        id: "support",
        value: 24,
        suffix: "/7",
        label: "Support",
        srLabel: "24 by 7 support",
      },
    ],
    floatingCards: [
      { id: "speed", title: "98", unit: "Performance", caption: "Lighthouse" },
      { id: "traffic", title: "+64%", unit: "Organic traffic", caption: "6 months" },
      { id: "uptime", title: "99.9%", unit: "Uptime", caption: "Monitored" },
    ],
  },
  services: {
    eyebrow: "What we build",
    title: "Websites engineered for growth, not just good looks",
    subtitle:
      "From a five-page brochure site to a bespoke web application, every build ships fast, accessible, and ready to rank.",
    learnMoreLabel: "Learn More",
    learnMoreHref: "/contact-us",
    items: [
      {
        id: "business",
        iconId: "Globe" as const,
        title: "Business Websites",
        description:
          "Conversion-focused sites for small and mid-sized businesses, built to turn visitors into enquiries.",
      },
      {
        id: "corporate",
        iconId: "Building2" as const,
        title: "Corporate Websites",
        description:
          "Multi-department, multi-language corporate presences with governance and approval workflows.",
      },
      {
        id: "landing",
        iconId: "Target" as const,
        title: "Landing Pages",
        description:
          "High-intent campaign pages with A/B-ready layouts, tuned for paid traffic and lead capture.",
      },
      {
        id: "portfolio",
        iconId: "LayoutGrid" as const,
        title: "Portfolio Websites",
        description:
          "Gallery-led sites for studios and creators, with fast image pipelines and case-study templates.",
      },
      {
        id: "ecommerce",
        iconId: "Shop" as const,
        title: "Ecommerce Stores",
        description:
          "Shopify, WooCommerce, and headless storefronts with clean checkout flows and analytics baked in.",
      },
      {
        id: "wordpress",
        iconId: "FileText" as const,
        title: "WordPress Development",
        description:
          "Custom themes and blocks your team can actually edit — no page-builder bloat, no plugin sprawl.",
      },
      {
        id: "apps",
        iconId: "Cpu" as const,
        title: "Custom Web Applications",
        description:
          "Portals, dashboards, and internal tools built on React and Node with role-based access control.",
      },
      {
        id: "redesign",
        iconId: "Sparkles" as const,
        title: "Website Redesign",
        description:
          "Modernise an ageing site without losing rankings — content, redirects, and equity carried across.",
      },
      {
        id: "maintenance",
        iconId: "Wrench" as const,
        title: "Maintenance & Support",
        description:
          "Patching, backups, uptime monitoring, and a named engineer on a predictable monthly retainer.",
      },
      {
        id: "optimization",
        iconId: "TrendingUp" as const,
        title: "Website Optimization",
        description:
          "Core Web Vitals, technical SEO, and conversion-rate work measured against your real analytics.",
      },
    ],
  },
  whyChooseUs: {
    eyebrow: "Why choose us",
    title: "Nine reasons teams stay with us after launch",
    subtitle:
      "We treat a website as infrastructure. It has to be quick, findable, secure, and cheap to change six months from now.",
    cta: { label: "Talk to an engineer", href: "/contact-us" },
    items: [
      {
        id: "responsive",
        iconId: "LayoutGrid" as const,
        title: "Mobile Responsive",
        description:
          "Designed mobile-first and tested on real devices from 320px up to ultrawide.",
      },
      {
        id: "fast",
        iconId: "Zap" as const,
        title: "Lightning Fast Performance",
        description:
          "Budgeted for Core Web Vitals, with image, font, and JavaScript payloads kept honest.",
      },
      {
        id: "seo",
        iconId: "Search" as const,
        title: "SEO Optimized",
        description:
          "Semantic markup, structured data, clean URLs, sitemaps, and a technical audit at handover.",
      },
      {
        id: "secure",
        iconId: "Shield" as const,
        title: "Secure Development",
        description:
          "Hardened headers, dependency scanning, least-privilege access, and encrypted secrets.",
      },
      {
        id: "uiux",
        iconId: "Sparkles" as const,
        title: "Modern UI/UX",
        description:
          "Interfaces built from a design system, so every page stays consistent as the site grows.",
      },
      {
        id: "cms",
        iconId: "FileText" as const,
        title: "CMS Integration",
        description:
          "Editors get structured, guard-railed fields instead of a blank rich-text box.",
      },
      {
        id: "scalable",
        iconId: "Package" as const,
        title: "Scalable Architecture",
        description:
          "Component-driven codebases that survive new sections, new markets, and new teams.",
      },
      {
        id: "support",
        iconId: "Users" as const,
        title: "Ongoing Support",
        description:
          "Named contacts, documented SLAs, and a change log you can actually read.",
      },
      {
        id: "pricing",
        iconId: "Dollar" as const,
        title: "Affordable Pricing",
        description:
          "Fixed-scope quotes with no surprise line items, plus staged payments tied to milestones.",
      },
    ],
  },
  process: {
    eyebrow: "How we work",
    title: "A seven-step process with no black boxes",
    subtitle:
      "You see working software early and often. Every stage ends in something you can review, not just a status update.",
    steps: [
      {
        id: "discovery",
        step: "01",
        title: "Discovery",
        duration: "Week 1",
        description:
          "Goals, audience, competitors, and the metrics that will tell us this project worked.",
      },
      {
        id: "planning",
        step: "02",
        title: "Planning",
        duration: "Week 1–2",
        description:
          "Sitemap, content model, technical approach, and a fixed scope you sign off before design starts.",
      },
      {
        id: "design",
        step: "03",
        title: "UI/UX Design",
        duration: "Week 2–4",
        description:
          "Wireframes to high-fidelity screens, with a component library and accessibility checked at design time.",
      },
      {
        id: "development",
        step: "04",
        title: "Development",
        duration: "Week 4–8",
        description:
          "Built in reviewable increments on a staging URL you can open any day of the week.",
      },
      {
        id: "testing",
        step: "05",
        title: "Testing",
        duration: "Week 8–9",
        description:
          "Cross-browser, device, performance, accessibility, and content QA — each with a written pass.",
      },
      {
        id: "launch",
        step: "06",
        title: "Launch",
        duration: "Week 9",
        description:
          "DNS, redirects, analytics, and search console handled by us, with a rollback plan ready.",
      },
      {
        id: "maintenance",
        step: "07",
        title: "Maintenance",
        duration: "Ongoing",
        description:
          "Monitoring, updates, and a monthly performance report with recommendations, not just numbers.",
      },
    ],
  },
  portfolio: {
    eyebrow: "Selected work",
    title: "Recent projects",
    subtitle:
      "Live builds across ecommerce, corporate, real estate, mobile UI, and service brands — designed for clarity, speed, and conversion.",
    viewLabel: "View Project",
    items: [
      {
        id: "intertop",
        featured: true,
        imageSrc: "/images/services/portfolio/intertop-ecommerce.jpg",
        category: "Ecommerce Website",
        title: "Intertop",
        summary:
          "Multi-brand footwear marketplace with campaign banners, brand carousel, and product grids tuned for high-volume retail traffic.",
        technologies: ["React", "Next.js", "Tailwind CSS", "Headless CMS"],
        href: "/contact-us",
        imageAlt:
          "Intertop ecommerce website showing a shopping day promotion, brand logos, and product grids",
      },
      {
        id: "carlamp",
        imageSrc: "/images/services/portfolio/carlamp-ecommerce.jpg",
        category: "Ecommerce Website",
        title: "Carlamp",
        summary:
          "Automotive LED lighting store with product series pages, vehicle fitment flows, and technical specification layouts.",
        technologies: ["WordPress", "WooCommerce", "PHP", "Custom Theme"],
        href: "/contact-us",
        imageAlt:
          "Carlamp automotive lighting ecommerce site with product series and LED bulb catalogues",
      },
      {
        id: "dompoint",
        imageSrc: "/images/services/portfolio/dompoint-real-estate.png",
        category: "Real Estate Landing",
        title: "DomPoint",
        summary:
          "Kyiv real-estate agency landing page with property listings, lead capture, and a mobile-first responsive layout.",
        technologies: ["WordPress", "Elementor", "Responsive UI", "Lead Forms"],
        href: "/contact-us",
        imageAlt:
          "DomPoint real estate agency landing page with desktop and mobile mockups",
      },
      // {
      //   id: "fitch",
      //   imageSrc: "/images/services/portfolio/fitch-corporate.png",
      //   category: "Corporate Website",
      //   title: "Fitch Ratings",
      //   summary:
      //     "Global financial intelligence portal with editorial grids, video hubs, podcast cards, and an events timeline.",
      //   technologies: ["React", "TypeScript", "Content Platform", "AWS"],
      //   href: "/contact-us",
      //   imageAlt:
      //     "Fitch Ratings corporate website with insights, videos, podcasts, and events sections",
      // },
      {
        id: "sushi-app",
        imageSrc: "/images/services/portfolio/sushi-mobile-app.png",
        category: "Mobile App UI",
        title: "Sushi Ordering App",
        summary:
          "Premium dark-mode food ordering experience with discovery feed, rich product detail, and streamlined checkout.",
        technologies: ["Figma", "React Native", "UI/UX Design", "Design System"],
        href: "/contact-us",
        imageAlt:
          "Sushi mobile app UI mockups showing splash, menu discovery, and product detail screens",
      },
      {
        id: "alveneis",
        imageSrc: "/images/services/portfolio/wedding.jpg",
        category: "Wedding Services",
        title: "Alveneis",
        summary:
          "Luxury wedding agency site with gold-accent brand storytelling, service showcases, and team profiles.",
        technologies: ["WordPress", "Custom Theme", "SEO", "Photography Layout"],
        href: "/contact-us",
        imageAlt:
          "Alveneis wedding services website with gold accents and service sections",
      },
      // {
      //   id: "kavkaz",
      //   imageSrc: "/images/services/portfolio/kavkaz-shooting-club.png",
      //   category: "Sports & Recreation",
      //   title: "Kavkaz Shooting Club",
      //   summary:
      //     "Tactical shooting club website with course booking, news, announcements, and an event photo gallery.",
      //   technologies: ["WordPress", "Custom Theme", "Booking Flow", "Gallery"],
      //   href: "/contact-us",
      //   imageAlt:
      //     "Kavkaz shooting club website with training courses and event photo gallery",
      // },
    ],
  },
  techStack: {
    eyebrow: "Technology",
    title: "The stack we build on",
    subtitle:
      "We pick the boring, well-supported option unless there is a measurable reason not to.",
    groups: [
      {
        id: "frontend",
        label: "Frontend",
        items: [
          { name: "HTML5", abbr: "H5" },
          { name: "CSS3", abbr: "C3" },
          { name: "JavaScript", abbr: "JS" },
          { name: "TypeScript", abbr: "TS" },
          { name: "React", abbr: "Re" },
          { name: "Next.js", abbr: "Nx" },
          { name: "Vue.js", abbr: "Vu" },
          { name: "Angular", abbr: "Ng" },
          { name: "Tailwind CSS", abbr: "Tw" },
          { name: "Bootstrap", abbr: "Bs" },
        ],
      },
      {
        id: "backend",
        label: "Backend & CMS",
        items: [
          { name: "Node.js", abbr: "No" },
          { name: "PHP", abbr: "Ph" },
          { name: "Laravel", abbr: "La" },
          { name: "WordPress", abbr: "Wp" },
        ],
      },
      {
        id: "commerce",
        label: "Ecommerce",
        items: [
          { name: "Shopify", abbr: "Sh" },
          { name: "WooCommerce", abbr: "Wo" },
        ],
      },
      {
        id: "data",
        label: "Data",
        items: [
          { name: "MySQL", abbr: "My" },
          { name: "PostgreSQL", abbr: "Pg" },
          { name: "MongoDB", abbr: "Mo" },
          { name: "Firebase", abbr: "Fb" },
        ],
      },
      {
        id: "infrastructure",
        label: "Infrastructure",
        items: [
          { name: "AWS", abbr: "Aw" },
          { name: "Vercel", abbr: "Ve" },
          { name: "Cloudflare", abbr: "Cf" },
          { name: "Docker", abbr: "Dk" },
          { name: "GitHub", abbr: "Gh" },
        ],
      },
    ],
  },
  benefits: {
    eyebrow: "What you get",
    title: "Every build ships with these as standard",
    subtitle:
      "Not upsells. These are the baseline we refuse to launch without.",
    items: [
      { id: "seo", title: "SEO Friendly", description: "Crawlable, structured, and indexed from day one." },
      { id: "fast", title: "Fast Loading", description: "Performance budgets enforced in the build pipeline." },
      { id: "mobile", title: "Mobile Optimized", description: "Tested on real hardware, not just a resized window." },
      { id: "secure", title: "Secure", description: "HTTPS, hardened headers, and scanned dependencies." },
      { id: "manage", title: "Easy to Manage", description: "A CMS your team can use without calling us." },
      { id: "modern", title: "Modern Design", description: "A design system that still looks current in year three." },
      { id: "convert", title: "High Conversion", description: "Clear paths to enquiry, measured and iterated." },
      { id: "scale", title: "Easy Scalability", description: "Add sections, locales, and integrations cleanly." },
    ],
  },
  testimonials: {
    eyebrow: "Client feedback",
    title: "What clients say after launch",
    subtitle:
      "Independent reviews collected six months post-launch, once the numbers were in.",
    items: [
      {
        id: "t1",
        name: "Priya Raman",
        role: "Marketing Director",
        company: "Northline Supply Co.",
        initials: "PR",
        rating: 5,
        quote:
          "Our old store took eleven seconds to load on mobile. The rebuild landed under two, and checkout completions went up 34% in the first quarter without us touching ad spend.",
      },
      {
        id: "t2",
        name: "Daniel Okafor",
        role: "Chief Operating Officer",
        company: "Arden Group",
        initials: "DO",
        rating: 5,
        quote:
          "Nine regional teams publish to the same site now. Before this, every content change was a support ticket. That alone paid for the project inside a year.",
      },
      {
        id: "t3",
        name: "Hannah Whitlock",
        role: "Practice Manager",
        company: "Meadowbrook Clinics",
        initials: "HW",
        rating: 5,
        quote:
          "They took accessibility seriously without being asked twice. We passed our WCAG audit first time, and online bookings now cover 60% of appointments.",
      },
    ],
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Transparent, fixed-scope pricing",
    subtitle:
      "Indicative starting points. Your quote is fixed after discovery — no hourly surprises.",
    footnote:
      "All prices exclude GST. Staged payments are tied to milestones, not calendar dates.",
    tiers: [
      {
        id: "starter",
        name: "Starter Website",
        priceLabel: "From $500",
        cadence: "one-off project",
        summary:
          "A credible, fast presence for a new business or a single service line.",
        featured: false,
        ctaLabel: "Get Free Quote",
        ctaHref: "/contact-us",
        features: [
          "Up to 5 pages",
          "Custom responsive design",
          "Contact form with spam protection",
          "Basic on-page SEO setup",
          "Google Analytics & Search Console",
          "2 rounds of revisions",
          "30 days post-launch support",
        ],
      },
      {
        id: "business",
        name: "Business Website",
        priceLabel: "From $6,900",
        cadence: "one-off project",
        summary:
          "A growing site with a CMS, content strategy, and room to expand.",
        featured: true,
        badge: "Most popular",
        ctaLabel: "Get Free Quote",
        ctaHref: "/contact-us",
        features: [
          "Up to 20 pages",
          "Full CMS with editor training",
          "Blog and case-study templates",
          "Technical SEO audit at handover",
          "Performance budget & Core Web Vitals pass",
          "WCAG 2.2 AA accessibility pass",
          "Analytics dashboard & goal tracking",
          "90 days post-launch support",
        ],
      },
      {
        id: "enterprise",
        name: "Custom Enterprise Solution",
        priceLabel: "Let's scope it",
        cadence: "quoted after discovery",
        summary:
          "Multi-market sites, ecommerce at scale, portals, and bespoke web applications.",
        featured: false,
        ctaLabel: "Book a Consultation",
        ctaHref: "/contact-us",
        features: [
          "Unlimited pages & locales",
          "Custom integrations and APIs",
          "Role-based access & approval workflows",
          "Design system & component library",
          "Automated testing and CI/CD",
          "Load testing and scaling plan",
          "Dedicated account engineer",
          "12-month SLA-backed support",
        ],
      },
    ],
  },
  faq: {
    eyebrow: "Questions",
    title: "Frequently asked questions",
    subtitle: "Still unsure? Ask us directly — we answer in plain language.",
    items: [
      {
        id: "f1",
        question: "How long does development take?",
        answer:
          "A starter site typically takes 3 to 4 weeks. A business site runs 8 to 10 weeks, and enterprise projects are scoped individually. The single biggest variable is how quickly final content and approvals come back, so we build the content deadline into the plan from day one.",
      },
      {
        id: "f2",
        question: "Do you provide hosting?",
        answer:
          "Yes. We host on Vercel, AWS, or Cloudflare depending on the build, and we can also deploy into infrastructure you already own. Managed hosting includes SSL, daily backups, uptime monitoring, and patching. If you would rather self-host, we hand over the deployment pipeline and documentation at no extra cost.",
      },
      {
        id: "f3",
        question: "Can you redesign my current website?",
        answer:
          "That is a large share of our work. We start with a technical and content audit, map every existing URL so search rankings carry across, and rebuild in stages. In most cases we can keep your current site live until the replacement is fully tested.",
      },
      {
        id: "f4",
        question: "Will my website be SEO optimized?",
        answer:
          "Every build ships with semantic HTML, a proper heading hierarchy, structured data, generated sitemaps, canonical URLs, and Open Graph tags. You receive a technical SEO audit at handover. We do not sell ongoing content marketing, but we will happily work alongside the agency that does.",
      },
      {
        id: "f5",
        question: "Can I edit the website myself?",
        answer:
          "Yes. We integrate a CMS with structured, guard-railed fields rather than a blank rich-text box, so edits stay on-brand and cannot break the layout. Editor training and a short written guide are included in every project above the starter tier.",
      },
      {
        id: "f6",
        question: "Do you provide maintenance?",
        answer:
          "We offer monthly retainers covering security patching, dependency updates, backups, uptime monitoring, and a set allocation of change requests. Every retainer includes a monthly report with performance data and specific recommendations.",
      },
      {
        id: "f7",
        question: "What technologies do you use?",
        answer:
          "Mostly React, Next.js, and TypeScript on the frontend, with Node.js, Laravel, or WordPress behind it depending on your team's skills. For ecommerce we use Shopify or WooCommerce. We choose the well-supported option your team can maintain, not whatever is trending.",
      },
      {
        id: "f8",
        question: "How much does a website cost?",
        answer:
          "Starter sites begin around $2,400, business sites around $6,900, and enterprise work is quoted after discovery. Price is driven by page count, integrations, and content volume. You get a fixed-scope quote before any work starts, so the number does not move mid-project.",
      },
    ],
  },
  finalCta: {
    title: "Ready to Build Your Dream Website?",
    description:
      "Let's create a high-performing website that helps your business grow.",
    primary: { label: "Get Free Consultation", href: "/contact-us" },
    secondary: { label: "Contact Us", href: "/contact-us" },
    contact: {
      title: "Prefer to talk first?",
      items: [
        { id: "phone", iconId: "Phone" as const, label: "+61 2 9099 5815", href: "tel:61290995815" },
        { id: "email", iconId: "Mail" as const, label: "sales@easylinkplus.com", href: "mailto:sales@easylinkplus.com" },
        { id: "address", iconId: "Pin" as const, label: "Sydney Australia, Mexico, India", href: null },
      ],
      social: [
        { id: "linkedin", label: "LinkedIn", href: "#" },
        { id: "facebook", label: "Facebook", href: "#" },
        { id: "x", label: "X", href: "#" },
        { id: "github", label: "GitHub", href: "#" },
      ],
    },
  },
} as const;

export type ServicesOffering = (typeof SERVICES_PAGE.services.items)[number];
export type ServicesReason = (typeof SERVICES_PAGE.whyChooseUs.items)[number];
export type ServicesProcessStep = (typeof SERVICES_PAGE.process.steps)[number];
export type ServicesPortfolioItem =
  (typeof SERVICES_PAGE.portfolio.items)[number];
export type ServicesPricingTier = (typeof SERVICES_PAGE.pricing.tiers)[number];
export type ServicesFaqEntry = (typeof SERVICES_PAGE.faq.items)[number];
export type ServicesTestimonial =
  (typeof SERVICES_PAGE.testimonials.items)[number];
