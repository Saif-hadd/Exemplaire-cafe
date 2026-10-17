export type Locale = "en" | "fr" | "ar";

export type TranslationKey =
  | "welcome"
  | "tagline"
  | "exploreMenu"
  | "exploreMenuDesc"
  | "shareExperience"
  | "shareExperienceDesc"
  | "connectWifi"
  | "connectWifiDesc"
  | "openMenu"
  | "leaveReview"
  | "contactWhatsapp"
  | "howWasExperience"
  | "feedbackWelcome"
  | "rateExperience"
  | "yourName"
  | "yourFeedback"
  | "submitFeedback"
  | "feedbackThanks"
  | "feedbackThanksDesc"
  | "publicGoogleReview"
  | "publicGoogleReviewDesc"
  | "privateWhatsapp"
  | "privateWhatsappDesc"
  | "bothOptionsAvailable"
  | "wifiAccess"
  | "wifiInstructions"
  | "networkName"
  | "password"
  | "showPassword"
  | "hidePassword"
  | "copy"
  | "copied"
  | "scanToConnect"
  | "connectionInstructions"
  | "wifiDisabled"
  | "openingHours"
  | "findUs"
  | "followUs"
  | "rightsReserved"
  | "search"
  | "searchPlaceholder"
  | "noResults"
  | "featured"
  | "bestseller"
  | "available"
  | "unavailable"
  | "ingredients"
  | "allergens"
  | "close"
  | "all"
  | "categories"
  | "menu"
  | "reviews"
  | "wifi"
  | "home"
  | "loadingMenu"
  | "currency";

export const translations: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    welcome: "Welcome to",
    tagline:
      "Where every dish tells a story of passion, tradition, and elegance.",
    exploreMenu: "Explore Our Menu",
    exploreMenuDesc:
      "Discover our curated selection of exquisite dishes and beverages.",
    shareExperience: "Share Your Experience",
    shareExperienceDesc:
      "Leave a Google review or send us private feedback via WhatsApp.",
    connectWifi: "Connect to Wi-Fi",
    connectWifiDesc: "Quickly access our guest network with a simple scan.",
    openMenu: "Open Menu",
    leaveReview: "Leave a Google Review",
    contactWhatsapp: "Contact Us on WhatsApp",
    howWasExperience: "How Was Your Experience?",
    feedbackWelcome:
      "We would love to hear about your visit. Your feedback helps us create unforgettable moments.",
    rateExperience: "Rate your experience",
    yourName: "Your name (optional)",
    yourFeedback: "Your feedback (optional)",
    submitFeedback: "Submit Feedback",
    feedbackThanks: "Thank You",
    feedbackThanksDesc:
      "Your feedback has been received. We appreciate you taking the time to share your experience.",
    publicGoogleReview: "Public Google Review",
    publicGoogleReviewDesc:
      "Share your experience publicly on Google for others to see.",
    privateWhatsapp: "Private WhatsApp Feedback",
    privateWhatsappDesc: "Send us a private message directly through WhatsApp.",
    bothOptionsAvailable:
      "Both options are always available, regardless of your rating.",
    wifiAccess: "Wi-Fi Access",
    wifiInstructions: "Connect to our complimentary guest network.",
    networkName: "Network Name",
    password: "Password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    copy: "Copy",
    copied: "Copied!",
    scanToConnect: "Scan to Connect",
    connectionInstructions:
      "Open your camera app and scan this code to connect automatically.",
    wifiDisabled:
      "Wi-Fi access is currently unavailable. Please ask our staff for assistance.",
    openingHours: "Opening Hours",
    findUs: "Find Us",
    followUs: "Follow Us",
    rightsReserved: "All rights reserved.",
    search: "Search",
    searchPlaceholder: "Search dishes, drinks...",
    noResults: "No items found. Try a different search.",
    featured: "Featured",
    bestseller: "Bestseller",
    available: "Available",
    unavailable: "Currently Unavailable",
    ingredients: "Ingredients",
    allergens: "Allergens",
    close: "Close",
    all: "All",
    categories: "Categories",
    menu: "Menu",
    reviews: "Reviews",
    wifi: "Wi-Fi",
    home: "Home",
    loadingMenu: "Loading menu...",
    currency: "DH",
  },
  fr: {
    welcome: "Bienvenue à",
    tagline:
      "Où chaque plat raconte une histoire de passion, de tradition et d'élégance.",
    exploreMenu: "Découvrir Notre Menu",
    exploreMenuDesc:
      "Découvrez notre sélection raffinée de plats et boissons exquis.",
    shareExperience: "Partagez Votre Expérience",
    shareExperienceDesc:
      "Laissez un avis Google ou envoyez-nous un message privé via WhatsApp.",
    connectWifi: "Se Connecter au Wi-Fi",
    connectWifiDesc:
      "Accédez rapidement à notre réseau invité avec un simple scan.",
    openMenu: "Ouvrir le Menu",
    leaveReview: "Laisser un Avis Google",
    contactWhatsapp: "Nous Contacter sur WhatsApp",
    howWasExperience: "Comment Était Votre Expérience?",
    feedbackWelcome:
      "Nous aimerions connaître votre avis. Vos commentaires nous aident à créer des moments inoubliables.",
    rateExperience: "Évaluez votre expérience",
    yourName: "Votre nom (optionnel)",
    yourFeedback: "Votre commentaire (optionnel)",
    submitFeedback: "Envoyer le Commentaire",
    feedbackThanks: "Merci",
    feedbackThanksDesc:
      "Votre commentaire a été reçu. Nous vous remercions d'avoir pris le temps de partager votre expérience.",
    publicGoogleReview: "Avis Google Public",
    publicGoogleReviewDesc:
      "Partagez votre expérience publiquement sur Google.",
    privateWhatsapp: "Commentaire Privé WhatsApp",
    privateWhatsappDesc:
      "Envoyez-nous un message privé directement via WhatsApp.",
    bothOptionsAvailable:
      "Les deux options sont toujours disponibles, quelle que soit votre note.",
    wifiAccess: "Accès Wi-Fi",
    wifiInstructions: "Connectez-vous à notre réseau invité gratuit.",
    networkName: "Nom du Réseau",
    password: "Mot de Passe",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    copy: "Copier",
    copied: "Copié!",
    scanToConnect: "Scanner pour Connecter",
    connectionInstructions:
      "Ouvrez votre application caméra et scannez ce code pour vous connecter automatiquement.",
    wifiDisabled:
      "L'accès Wi-Fi est actuellement indisponible. Veuillez demander de l'aide à notre personnel.",
    openingHours: "Heures d'Ouverture",
    findUs: "Nous Trouver",
    followUs: "Suivez-Nous",
    rightsReserved: "Tous droits réservés.",
    search: "Rechercher",
    searchPlaceholder: "Rechercher plats, boissons...",
    noResults: "Aucun article trouvé. Essayez une autre recherche.",
    featured: "Vedette",
    bestseller: "Meilleure Vente",
    available: "Disponible",
    unavailable: "Actuellement Indisponible",
    ingredients: "Ingrédients",
    allergens: "Allergènes",
    close: "Fermer",
    all: "Tout",
    categories: "Catégories",
    menu: "Menu",
    reviews: "Avis",
    wifi: "Wi-Fi",
    home: "Accueil",
    loadingMenu: "Chargement du menu...",
    currency: "DH",
  },
  ar: {
    welcome: "مرحباً بكم في",
    tagline: "حيث يروي كل طبق قصة من الشغف والتقاليد والأناقة.",
    exploreMenu: "استكشف قائمتنا",
    exploreMenuDesc: "اكتشف مجموعتنا المنتقاة من الأطباق والمشروبات الفاخرة.",
    shareExperience: "شارك تجربتك",
    shareExperienceDesc:
      "اترك تقييم Google أو أرسل لنا ملاحظات خاصة عبر WhatsApp.",
    connectWifi: "الاتصال بالواي فاي",
    connectWifiDesc: "ادخل بسرعة إلى شبكة الضيافة بمسح بسيط.",
    openMenu: "فتح القائمة",
    leaveReview: "اترك تقييم Google",
    contactWhatsapp: "تواصل معنا على WhatsApp",
    howWasExperience: "كيف كانت تجربتك؟",
    feedbackWelcome:
      "نود أن نسمع عن زيارتك. تساعدنا ملاحظاتك في خلق لحظات لا تُنسى.",
    rateExperience: "قيّم تجربتك",
    yourName: "اسمك (اختياري)",
    yourFeedback: "ملاحظاتك (اختياري)",
    submitFeedback: "إرسال الملاحظات",
    feedbackThanks: "شكراً لك",
    feedbackThanksDesc:
      "تم استلام ملاحظاتك. نقدر لك تخصيص الوقت لمشاركة تجربتك.",
    publicGoogleReview: "تقييم Google العام",
    publicGoogleReviewDesc: "شارك تجربتك علناً على Google ليراها الآخرون.",
    privateWhatsapp: "ملاحظات خاصة عبر WhatsApp",
    privateWhatsappDesc: "أرسل لنا رسالة خاصة مباشرة عبر WhatsApp.",
    bothOptionsAvailable: "كلا الخيارين متاحان دائماً، بغض النظر عن تقييمك.",
    wifiAccess: "الوصول إلى الواي فاي",
    wifiInstructions: "اتصل بشبكة الضيوف المجانية لدينا.",
    networkName: "اسم الشبكة",
    password: "كلمة المرور",
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    copy: "نسخ",
    copied: "تم النسخ!",
    scanToConnect: "امسح للاتصال",
    connectionInstructions:
      "افتح تطبيق الكاميرا وامسح هذا الرمز للاتصال تلقائياً.",
    wifiDisabled:
      "الوصول إلى الواي فاي غير متاح حالياً. يرجى سؤال موظفينا للمساعدة.",
    openingHours: "ساعات العمل",
    findUs: "موقعنا",
    followUs: "تابعنا",
    rightsReserved: "جميع الحقوق محفوظة.",
    search: "بحث",
    searchPlaceholder: "ابحث عن أطباق، مشروبات...",
    noResults: "لم يتم العثور على عناصر. جرب بحثاً آخر.",
    featured: "مميز",
    bestseller: "الأكثر مبيعاً",
    available: "متاح",
    unavailable: "غير متاح حالياً",
    ingredients: "المكونات",
    allergens: "مسببات الحساسية",
    close: "إغلاق",
    all: "الكل",
    categories: "الفئات",
    menu: "القائمة",
    reviews: "التقييمات",
    wifi: "واي فاي",
    home: "الرئيسية",
    loadingMenu: "جارٍ تحميل القائمة...",
    currency: "درهم",
  },
};

export const restaurantInfo = {
  name: "Maison Or",
  nameAr: "ميزون أور",
  nameFr: "Maison Or",
  description:
    "A premium restaurant & café offering an exquisite blend of traditional and contemporary cuisine.",
  address: "123 Boulevard Mohammed V, Casablanca, Morocco",
  phone: "+212 5 22 00 00 00",
  whatsapp: "212522000000",
  hours: [
    { day: "Monday — Thursday", time: "08:00 — 23:00" },
    { day: "Friday — Saturday", time: "08:00 — 01:00" },
    { day: "Sunday", time: "09:00 — 22:00" },
  ],
  social: {
    instagram: "https://instagram.com",
    facebook: "https://facebook.com",
    twitter: "https://twitter.com",
  },
  googleReviewUrl: "https://g.page/r/restaurant/review",
  mapsUrl: "https://maps.google.com",
  coverImage: "/images/20184685.jpg",
  logo: null as string | null,
};

export type MenuCategory = {
  id: string;
  name: string;
  nameFr?: string;
  nameAr?: string;
  icon: string;
  order: number;
};

export type MenuProduct = {
  id: string;
  categoryId: string;
  name: string;
  nameFr?: string;
  nameAr?: string;
  description: string;
  descriptionFr?: string;
  descriptionAr?: string;
  price: number;
  image: string | null;
  available: boolean;
  featured: boolean;
  bestseller: boolean;
  ingredients?: string[];
  allergens?: string[];
  dietary?: string[];
};

export const menuCategories: MenuCategory[] = [
  {
    id: "coffee",
    name: "Coffee",
    nameFr: "Café",
    nameAr: "قهوة",
    icon: "Coffee",
    order: 0,
  },
  {
    id: "tea",
    name: "Tea",
    nameFr: "Thé",
    nameAr: "شاي",
    icon: "Leaf",
    order: 1,
  },
  {
    id: "juices",
    name: "Fresh Juices",
    nameFr: "Jus Frais",
    nameAr: "عصائر طازجة",
    icon: "CupSoda",
    order: 2,
  },
  {
    id: "mocktails",
    name: "Mocktails",
    nameFr: "Mocktails",
    nameAr: "موكتيل",
    icon: "Wine",
    order: 3,
  },
  {
    id: "breakfast",
    name: "Breakfast",
    nameFr: "Petit-déjeuner",
    nameAr: "فطور",
    icon: "Croissant",
    order: 4,
  },
  {
    id: "starters",
    name: "Starters",
    nameFr: "Entrées",
    nameAr: "المقبلات",
    icon: "Salad",
    order: 5,
  },
  {
    id: "mains",
    name: "Main Courses",
    nameFr: "Plats Principaux",
    nameAr: "الأطباق الرئيسية",
    icon: "UtensilsCrossed",
    order: 6,
  },
  {
    id: "burgers",
    name: "Burgers",
    nameFr: "Burgers",
    nameAr: "برغر",
    icon: "Beef",
    order: 7,
  },
  {
    id: "pizza",
    name: "Pizza",
    nameFr: "Pizza",
    nameAr: "بيتزا",
    icon: "Pizza",
    order: 8,
  },
  {
    id: "desserts",
    name: "Desserts",
    nameFr: "Desserts",
    nameAr: "الحلويات",
    icon: "CakeSlice",
    order: 9,
  },
];

export const menuProducts: MenuProduct[] = [
  // Coffee
  {
    id: "c1",
    categoryId: "coffee",
    name: "Cappuccino",
    nameFr: "Cappuccino",
    nameAr: "كابتشينو",
    description:
      "Rich espresso topped with velvety steamed milk and delicate foam art.",
    price: 28,
    image: "/images/4913342.jpg",
    available: true,
    featured: true,
    bestseller: true,
    ingredients: ["Espresso", "Steamed milk", "Milk foam"],
    allergens: ["Dairy"],
    dietary: ["Vegetarian"],
  },
  {
    id: "c2",
    categoryId: "coffee",
    name: "Latte Art Special",
    nameFr: "Latte Art Spécial",
    nameAr: "لاتيه آرت",
    description:
      "Smooth espresso with silky micro-foam milk, crafted with beautiful latte art.",
    price: 32,
    image: "/images/10206600.jpg",
    available: true,
    featured: false,
    bestseller: false,
    ingredients: ["Double espresso", "Steamed milk", "Micro-foam"],
    allergens: ["Dairy"],
    dietary: ["Vegetarian"],
  },
  {
    id: "c3",
    categoryId: "coffee",
    name: "Signature Coffee",
    nameFr: "Café Signature",
    nameAr: "قهوة سيغناتشر",
    description:
      "Our house blend with intricate froth art and a smooth finish.",
    price: 30,
    image: "/images/15997567.jpg",
    available: true,
    featured: false,
    bestseller: false,
    ingredients: ["House espresso blend", "Steamed milk"],
    allergens: ["Dairy"],
    dietary: ["Vegetarian"],
  },
  // Tea
  {
    id: "t1",
    categoryId: "tea",
    name: "Chamomile Herbal Tea",
    nameFr: "Tisane de Camomille",
    nameAr: "شاي البابونج",
    description:
      "Soothing herbal tea with chamomile flowers, served in an elegant glass mug.",
    price: 22,
    image: "/images/27385918.jpg",
    available: true,
    featured: false,
    bestseller: false,
    ingredients: ["Chamomile flowers", "Hot water"],
    allergens: [],
    dietary: ["Vegan", "Gluten-free"],
  },
  {
    id: "t2",
    categoryId: "tea",
    name: "Mint Infusion",
    nameFr: "Infusion à la Menthe",
    nameAr: "منعش النعناع",
    description:
      "Aromatic herbal tea with fresh mint leaves, perfect for a cozy afternoon.",
    price: 24,
    image: "/images/5275234.jpg",
    available: true,
    featured: false,
    bestseller: false,
    ingredients: ["Fresh mint leaves", "Hot water"],
    allergens: [],
    dietary: ["Vegan", "Gluten-free"],
  },
  // Juices
  {
    id: "j1",
    categoryId: "juices",
    name: "Fresh Orange Juice",
    nameFr: "Jus d'Orange Frais",
    nameAr: "عصير برتقال طازج",
    description: "Freshly squeezed orange juice garnished with mint leaves.",
    price: 25,
    image: "/images/6416553.jpg",
    available: true,
    featured: true,
    bestseller: true,
    ingredients: ["Fresh oranges", "Mint leaves"],
    allergens: [],
    dietary: ["Vegan", "Gluten-free"],
  },
  {
    id: "j2",
    categoryId: "juices",
    name: "Blood Orange Special",
    nameFr: "Orange Sanguine Spécial",
    nameAr: "برتقال أحمر خاص",
    description: "Vibrant blood orange juice served on Moroccan-style tiles.",
    price: 28,
    image: "/images/13546345.jpg",
    available: true,
    featured: false,
    bestseller: false,
    ingredients: ["Blood oranges"],
    allergens: [],
    dietary: ["Vegan", "Gluten-free"],
  },
  // Mocktails
  {
    id: "m1",
    categoryId: "mocktails",
    name: "Mint Lime Refresher",
    nameFr: "Rafraîchissement Menthe Citron",
    nameAr: "منعش النعناع والليم",
    description: "Refreshing mint and lime beverage served in a mason jar.",
    price: 35,
    image: "/images/10839495.jpg",
    available: true,
    featured: false,
    bestseller: true,
    ingredients: ["Fresh mint", "Lime", "Sparkling water", "Ice"],
    allergens: [],
    dietary: ["Vegan", "Gluten-free"],
  },
  {
    id: "m2",
    categoryId: "mocktails",
    name: "Crimson Rosemary",
    nameFr: "Romarin Cramoisi",
    nameAr: "كريمسون روزماري",
    description:
      "Stylish red mocktail with a rosemary garnish in a crystal glass.",
    price: 38,
    image: "/images/29748124.jpg",
    available: true,
    featured: true,
    bestseller: false,
    ingredients: ["Cranberry", "Rosemary", "Sparkling water", "Ice"],
    allergens: [],
    dietary: ["Vegan", "Gluten-free"],
  },
  // Breakfast
  {
    id: "b1",
    categoryId: "breakfast",
    name: "Almond Croissant",
    nameFr: "Croissant aux Amandes",
    nameAr: "كرواسون باللوز",
    description:
      "Freshly baked almond croissants with a delicate sprinkle of powdered sugar.",
    price: 26,
    image: "/images/13439698.jpg",
    available: true,
    featured: true,
    bestseller: true,
    ingredients: ["Flour", "Butter", "Almonds", "Powdered sugar"],
    allergens: ["Gluten", "Dairy", "Nuts"],
    dietary: ["Vegetarian"],
  },
  {
    id: "b2",
    categoryId: "breakfast",
    name: "Avocado Toast",
    nameFr: "Tartine d'Avocat",
    nameAr: "توست الأفوكادو",
    description:
      "Delicious vegan toast with avocado spread, eggs, and fresh herbs.",
    price: 42,
    image: "/images/27590337.jpg",
    available: true,
    featured: false,
    bestseller: false,
    ingredients: ["Sourdough bread", "Avocado", "Eggs", "Fresh herbs"],
    allergens: ["Gluten", "Eggs"],
    dietary: ["Vegetarian"],
  },
  // Starters
  {
    id: "s1",
    categoryId: "starters",
    name: "Gourmet Dumplings",
    nameFr: "Raviolis Gourmets",
    nameAr: "فطائر فاخرة",
    description:
      "Elegant top-view veggie dumplings in rich sauce, garnished with caviar.",
    price: 55,
    image: "/images/18229217.jpg",
    available: true,
    featured: false,
    bestseller: false,
    ingredients: ["Vegetable dumplings", "Sauce", "Caviar garnish"],
    allergens: ["Fish", "Soy"],
    dietary: ["Pescatarian"],
  },
  {
    id: "s2",
    categoryId: "starters",
    name: "Middle Eastern Mezze",
    nameFr: "Mezze Oriental",
    nameAr: "مزة شرق أوسطية",
    description:
      "Colorful mezze platter featuring flatbreads, hummus, falafel, and more.",
    price: 65,
    image: "/images/25907496.jpg",
    available: true,
    featured: true,
    bestseller: false,
    ingredients: ["Flatbread", "Hummus", "Falafel", "Olives", "Vegetables"],
    allergens: ["Gluten"],
    dietary: ["Vegan"],
  },
  // Mains
  {
    id: "ma1",
    categoryId: "mains",
    name: "Grilled Steak",
    nameFr: "Steak Grillé",
    nameAr: "ستيك مشوي",
    description:
      "Perfectly grilled steak with vegetables served on a cast iron plate.",
    price: 120,
    image: "/images/36850059.jpg",
    available: true,
    featured: true,
    bestseller: true,
    ingredients: ["Premium beef steak", "Grilled vegetables", "Seasoning"],
    allergens: [],
    dietary: ["Gluten-free"],
  },
  {
    id: "ma2",
    categoryId: "mains",
    name: "Grilled Fish Special",
    nameFr: "Poisson Grillé Spécial",
    nameAr: "سمك مشوي خاص",
    description:
      "Gourmet grilled fish elegantly plated with vibrant garnishes.",
    price: 110,
    image: "/images/6046746.jpg",
    available: true,
    featured: false,
    bestseller: false,
    ingredients: ["Fresh fish", "Lemon", "Herbs", "Vegetables"],
    allergens: ["Fish"],
    dietary: ["Pescatarian", "Gluten-free"],
  },
  // Burgers
  {
    id: "bu1",
    categoryId: "burgers",
    name: "Gourmet Cheeseburger",
    nameFr: "Cheeseburger Gourmet",
    nameAr: "برغر الجبن الفاخر",
    description:
      "Gourmet burger with melted cheese, fresh lettuce, and premium beef.",
    price: 75,
    image: "/images/5041475.jpg",
    available: true,
    featured: false,
    bestseller: true,
    ingredients: ["Premium beef", "Cheddar cheese", "Lettuce", "Brioche bun"],
    allergens: ["Gluten", "Dairy"],
    dietary: [],
  },
  {
    id: "bu2",
    categoryId: "burgers",
    name: "Classic Cheeseburger",
    nameFr: "Cheeseburger Classique",
    nameAr: "برغر جبن كلاسيكي",
    description:
      "Cheeseburger with layers of meat and cheese, served with a fork and knife.",
    price: 68,
    image: "/images/20722047.jpg",
    available: true,
    featured: false,
    bestseller: false,
    ingredients: ["Beef patty", "Cheddar", "Onions", "Sesame bun"],
    allergens: ["Gluten", "Dairy", "Sesame"],
    dietary: [],
  },
  // Pizza
  {
    id: "p1",
    categoryId: "pizza",
    name: "Margherita",
    nameFr: "Margherita",
    nameAr: "مارجريتا",
    description:
      "Delicious Margherita pizza with fresh basil, baked in a traditional brick oven.",
    price: 70,
    image: "/images/28945103.jpg",
    available: true,
    featured: true,
    bestseller: false,
    ingredients: ["Tomato sauce", "Mozzarella", "Fresh basil", "Olive oil"],
    allergens: ["Gluten", "Dairy"],
    dietary: ["Vegetarian"],
  },
  {
    id: "p2",
    categoryId: "pizza",
    name: "Olives & Wine Pizza",
    nameFr: "Pizza Olives & Vin",
    nameAr: "بيتزا الزيتون",
    description: "Wood-fired pizza with olives, served with elegant tableware.",
    price: 78,
    image: "/images/29021747.jpg",
    available: false,
    featured: false,
    bestseller: false,
    ingredients: ["Tomato sauce", "Mozzarella", "Olives", "Oregano"],
    allergens: ["Gluten", "Dairy"],
    dietary: ["Vegetarian"],
  },
  // Desserts
  {
    id: "d1",
    categoryId: "desserts",
    name: "Chocolate & Raspberry",
    nameFr: "Chocolat & Framboise",
    nameAr: "شوكولاتة وتوت",
    description:
      "Chocolate dessert garnished with raspberries and an edible flower.",
    price: 45,
    image: "/images/9271569.jpg",
    available: true,
    featured: true,
    bestseller: true,
    ingredients: ["Dark chocolate", "Raspberries", "Edible flower"],
    allergens: ["Dairy"],
    dietary: ["Vegetarian", "Gluten-free"],
  },
  {
    id: "d2",
    categoryId: "desserts",
    name: "Mango Delight",
    nameFr: "Délice à la Mangue",
    nameAr: "حلى المانجو",
    description:
      "Artistic mango dessert garnished with vibrant edible flowers.",
    price: 42,
    image: "/images/29530032.jpg",
    available: true,
    featured: false,
    bestseller: false,
    ingredients: ["Mango", "Edible flowers", "Creme base"],
    allergens: ["Dairy"],
    dietary: ["Vegetarian"],
  },
];

export const wifiSettings = {
  ssid: "MaisonOr_Guest",
  password: "Welcome2024!",
  security: "WPA",
  hidden: false,
  enabled: true,
};
