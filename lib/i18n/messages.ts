// Homepage UI translations only. Admin panel and other pages stay English
// regardless of the active locale. Add keys as nested objects; the useT()
// hook accesses them via dot-path strings.

export type Locale = 'en' | 'ar'

export type Messages = {
  nav: {
    searchPlaceholder: string
    login: string
    signUp: string
    logout: string
    openMessages: string
    openNotifications: string
    languageToggle: string
  }
  hero: {
    badge: string
    titleLine1: string
    titleLine2: string
    tagline: string
    ctaExplore: string
    ctaSell: string
    featureAiTitle: string
    featureAiBody: string
    featurePricingTitle: string
    featurePricingBody: string
    featureSafeTitle: string
    featureSafeBody: string
  }
  categories: {
    badge: string
    titlePart1: string
    titlePart2: string
    subtitle: string
    popularSectionTitle: string
    allSectionTitle: string
    popularBadge: string
    itemsSuffix: string
    ctaTitle: string
    ctaBody: string
    ctaButton: string
    presentation: Record<string, string>
  }
  feed: {
    badgePersonalized: string
    badgeFallback: string
    badgeSignedOut: string
    badgeCurated: string
    titlePart1: string
    titlePart2: string
    note: {
      personalized: string
      fallback: string
      signedOut: string
      sectionTrending: string
      sectionNearby: string
      sectionAll: string
    }
    filters: {
      forYou: string
      forYouSignedOut: string
      forYouFallback: string
      forYouPersonalized: string
      trending: string
      trendingDesc: string
      nearby: string
      nearbyDesc: string
      nearbyDenied: string
      all: string
      allDesc: string
    }
    viewMode: string
    viewCarousel: string
    viewGrid: string
    loadingLocation: string
    loadingItems: string
    noResultsTitle: string
    noResultsNearby: string
    noResultsRecommended: string
    noResultsTrending: string
    noResultsDefault: string
    browseAll: string
    prevSlide: string
    nextSlide: string
    carouselLabel: string
    goToSlide: string
    keepExploringTitle: string
    keepExploringBody: string
    browseFull: string
    switchTrending: string
    additionalContext: string
    showingNItems: string
  }
  recentlyViewed: {
    title: string
    refresh: string
  }
  featured: {
    badge: string
    titleAccent: string
    titleRest: string
    subtitle: string
    statListings: string
    statCategories: string
    statSellers: string
    ctaTitle: string
    ctaBody: string
    ctaStart: string
    ctaBecome: string
    ctaBrowse: string
  }
  howItWorks: {
    badge: string
    titlePart1: string
    titlePart2: string
    subtitle: string
    steps: {
      discover: { title: string; description: string }
      connect: { title: string; description: string }
      deal: { title: string; description: string }
      review: { title: string; description: string }
    }
    feature: {
      aiSearch: string
      smartFilters: string
      personalizedFeed: string
      secureMessaging: string
      realtimeChat: string
      fileSharing: string
      safeMeetups: string
      securePayment: string
      escrowService: string
      rateSellers: string
      writeReviews: string
      buildTrust: string
    }
    stat: {
      items: string
      instantSupport: string
      secure: string
      averageStars: string
    }
    ctaTitle: string
    ctaBody: string
    ctaBuy: string
    ctaSell: string
  }
  footer: {
    tagline: string
    pillAiPricing: string
    pillTrustedSellers: string
    pillLocalDiscovery: string
    quickLinks: string
    linkHome: string
    linkBrowse: string
    linkSell: string
    linkFavorites: string
    linkSupport: string
    popularCategories: string
    standards: string
    standardCleaner: string
    standardModeration: string
    standardDocs: string
    rights: string
    seller: string
    privacy: string
    terms: string
  }
}

const en: Messages = {
  nav: {
    searchPlaceholder: 'Search for anything...',
    login: 'Login',
    signUp: 'Sign Up',
    logout: 'Logout',
    openMessages: 'Open messages',
    openNotifications: 'Open notifications',
    languageToggle: 'عربي',
  },
  hero: {
    badge: 'AI-Powered Marketplace',
    titleLine1: 'Your Way to Go',
    titleLine2: 'Second Hand',
    tagline: 'Your AI assistant helps you find perfect deals and price items intelligently',
    ctaExplore: 'Start Exploring',
    ctaSell: 'Sell Now',
    featureAiTitle: 'AI Assistant',
    featureAiBody: 'Smart recommendations tailored to your preferences',
    featurePricingTitle: 'Smart Pricing',
    featurePricingBody: 'AI-powered pricing suggestions for optimal deals',
    featureSafeTitle: 'Safe & Secure',
    featureSafeBody: 'Protected transactions with verified sellers',
  },
  categories: {
    badge: 'Explore Categories',
    titlePart1: 'Discover by ',
    titlePart2: 'Category',
    subtitle: "Find exactly what you're looking for with our smart categorization system",
    popularSectionTitle: 'Popular This Week',
    allSectionTitle: 'All Categories',
    popularBadge: 'Popular',
    itemsSuffix: 'items',
    ctaTitle: "Can't find what you're looking for?",
    ctaBody: 'Use our AI-powered search to find anything',
    ctaButton: 'Try AI Search',
    presentation: {
      electronics: 'Phones, laptops, cameras & more',
      furniture: 'Sofas, tables, chairs & decor',
      vehicles: 'Cars, motorcycles, bikes',
      fashion: 'Clothes, shoes, accessories',
      home: 'Kitchen, garden, tools',
      sports: 'Fitness, outdoor, equipment',
      books: 'Books, magazines, media',
      toys: 'Board games, toys, puzzles',
      music: 'Instruments, audio gear, music tools',
      gaming: 'Consoles, games, accessories',
      default: 'Browse listings in this category',
    },
  },
  feed: {
    badgePersonalized: 'Personalized for you',
    badgeFallback: 'Fresh marketplace picks',
    badgeSignedOut: 'Sign in for tailored picks',
    badgeCurated: 'Curated marketplace discovery',
    titlePart1: 'Recommended',
    titlePart2: 'for your next browse',
    note: {
      personalized: 'We use your wishlist, recent browsing, and location when available to surface relevant active listings.',
      fallback: 'Showing the freshest active listings while we collect more signals from you.',
      signedOut: 'Sign in to personalize this feed. For now, showing the freshest active listings.',
      sectionTrending: 'See the listings getting the most attention right now.',
      sectionNearby: 'Use your location to surface listings closer to you.',
      sectionAll: 'Browse the newest active listings across all categories.',
    },
    filters: {
      forYou: 'For You',
      forYouSignedOut: 'Sign in to personalize this feed',
      forYouFallback: 'Fresh picks while we learn your taste',
      forYouPersonalized: 'Blended from your activity and saved interests',
      trending: 'Trending',
      trendingDesc: 'What is hot across the marketplace',
      nearby: 'Nearby',
      nearbyDesc: 'Close to your location',
      nearbyDenied: 'Location permission was denied',
      all: 'All Items',
      allDesc: 'Newest active listings across the marketplace',
    },
    viewMode: 'View Mode:',
    viewCarousel: 'Carousel',
    viewGrid: 'Grid',
    loadingLocation: 'Requesting location access...',
    loadingItems: 'Loading items...',
    noResultsTitle: 'No items found',
    noResultsNearby: 'No items showed up near your current area yet. You can keep browsing the full marketplace instead.',
    noResultsRecommended: 'We do not have enough matching signals yet. Try saving a few favorites or browsing more listings first.',
    noResultsTrending: 'Nothing is trending right now. Check back soon.',
    noResultsDefault: 'No items are available in this view right now.',
    browseAll: 'Browse All Items',
    prevSlide: 'Previous slide',
    nextSlide: 'Next slide',
    carouselLabel: 'Recommended listings carousel',
    goToSlide: 'Go to slide',
    keepExploringTitle: 'Want to keep exploring?',
    keepExploringBody: 'Jump into the full browse experience for deeper filters, saved searches, and the complete live inventory.',
    browseFull: 'Browse Full Inventory',
    switchTrending: 'Switch to Trending',
    additionalContext: 'This section adapts to the signals we actually have. When signals are weak, it falls back to fresh marketplace picks instead of pretending to be deeply personalized.',
    showingNItems: 'Showing {count} items in this view right now.',
  },
  recentlyViewed: {
    title: 'Recently viewed',
    refresh: 'Refresh',
  },
  featured: {
    badge: 'Fresh Marketplace Picks',
    titleAccent: 'Fresh',
    titleRest: 'Listings To Explore',
    subtitle: 'A live snapshot of recently added items from across the marketplace, updated as new listings come in.',
    statListings: 'Listings Shown',
    statCategories: 'Categories Covered',
    statSellers: 'Verified Sellers In View',
    ctaTitle: 'Ready to list something of your own?',
    ctaBody: 'Start selling on Weggo and get your items in front of buyers across the marketplace.',
    ctaStart: 'Start Selling',
    ctaBecome: 'Become A Seller',
    ctaBrowse: 'Browse More',
  },
  howItWorks: {
    badge: 'How It Works',
    titlePart1: 'How ',
    titlePart2: 'Weggo Works',
    subtitle: 'Simple, secure, and smart — 4 easy steps to buy and sell',
    steps: {
      discover: {
        title: 'Discover',
        description: 'Use our AI assistant to find exactly what you need, or browse personalized recommendations',
      },
      connect: {
        title: 'Connect',
        description: 'Chat directly with sellers, ask questions, and negotiate the best price',
      },
      deal: {
        title: 'Deal',
        description: 'Arrange a safe meetup in a public place and complete your purchase',
      },
      review: {
        title: 'Review',
        description: 'Share your experience to help build a trusted community',
      },
    },
    feature: {
      aiSearch: 'AI-Powered Search',
      smartFilters: 'Smart Filters',
      personalizedFeed: 'Personalized Feed',
      secureMessaging: 'Secure Messaging',
      realtimeChat: 'Real-time Chat',
      fileSharing: 'File Sharing',
      safeMeetups: 'Safe Meetups',
      securePayment: 'Secure Payment',
      escrowService: 'Escrow Service',
      rateSellers: 'Rate Sellers',
      writeReviews: 'Write Reviews',
      buildTrust: 'Build Trust',
    },
    stat: {
      items: '2M+ Items',
      instantSupport: 'Instant Support',
      secure: '100% Secure',
      averageStars: '4.8★ Average',
    },
    ctaTitle: 'Ready to get started?',
    ctaBody: 'Join thousands of Egyptians who are already buying and selling on Weggo',
    ctaBuy: 'Start Buying',
    ctaSell: 'Start Selling',
  },
  footer: {
    tagline: "Egypt's smartest marketplace for buying and selling second-hand goods. Powered by AI.",
    pillAiPricing: 'AI pricing',
    pillTrustedSellers: 'Trusted sellers',
    pillLocalDiscovery: 'Local discovery',
    quickLinks: 'Quick Links',
    linkHome: 'Home',
    linkBrowse: 'Browse',
    linkSell: 'Sell',
    linkFavorites: 'Favorites',
    linkSupport: 'Support',
    popularCategories: 'Popular Categories',
    standards: 'Marketplace Standards',
    standardCleaner: 'Cleaner listings, fairer pricing, and faster discovery for buyers and sellers.',
    standardModeration: 'Moderation, seller verification, and review workflows keep the marketplace tighter before launch.',
    standardDocs: 'Need details? Use the support center, seller guidelines, and legal pages linked below.',
    rights: 'All rights reserved. Made with ❤️ in Egypt',
    seller: 'Seller Guidelines',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
  },
}

const ar: Messages = {
  nav: {
    searchPlaceholder: 'ابحث عن أي شيء...',
    login: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    logout: 'تسجيل الخروج',
    openMessages: 'فتح الرسائل',
    openNotifications: 'فتح الإشعارات',
    languageToggle: 'EN',
  },
  hero: {
    badge: 'سوق مدعوم بالذكاء الاصطناعي',
    titleLine1: 'طريقك إلى',
    titleLine2: 'كل مستعمل',
    tagline: 'مساعدك الذكي يساعدك تلاقي أحسن العروض وتسعّر منتجاتك صح',
    ctaExplore: 'ابدأ التصفح',
    ctaSell: 'ابيع دلوقتي',
    featureAiTitle: 'مساعد ذكي',
    featureAiBody: 'توصيات ذكية مصممة على ذوقك',
    featurePricingTitle: 'تسعير ذكي',
    featurePricingBody: 'اقتراحات أسعار بالذكاء الاصطناعي عشان أحسن صفقة',
    featureSafeTitle: 'آمن وموثوق',
    featureSafeBody: 'معاملات محمية مع بائعين موثّقين',
  },
  categories: {
    badge: 'استكشف الأقسام',
    titlePart1: 'تصفّح حسب ',
    titlePart2: 'القسم',
    subtitle: 'لاقي اللي بتدوّر عليه بظبط مع نظام التصنيف الذكي بتاعنا',
    popularSectionTitle: 'الأكثر رواجاً هذا الأسبوع',
    allSectionTitle: 'كل الأقسام',
    popularBadge: 'رائج',
    itemsSuffix: 'منتج',
    ctaTitle: 'مش لاقي اللي بتدوّر عليه؟',
    ctaBody: 'استخدم البحث الذكي بتاعنا تلاقي أي حاجة',
    ctaButton: 'جرّب البحث الذكي',
    presentation: {
      electronics: 'موبايلات، لاب توب، كاميرات والمزيد',
      furniture: 'كنب، ترابيزات، كراسي وديكورات',
      vehicles: 'عربيات، موتوسيكلات، عجل',
      fashion: 'هدوم، أحذية، إكسسوارات',
      home: 'مطبخ، حديقة، أدوات',
      sports: 'لياقة، رياضات خارجية، معدات',
      books: 'كتب، مجلات، وسائط',
      toys: 'ألعاب طاولة، ألعاب أطفال، بازل',
      music: 'آلات موسيقية، معدات صوت',
      gaming: 'أجهزة ألعاب، ألعاب، إكسسوارات',
      default: 'تصفح المنتجات في هذا القسم',
    },
  },
  feed: {
    badgePersonalized: 'مختار لك خصيصاً',
    badgeFallback: 'أحدث منتجات السوق',
    badgeSignedOut: 'سجّل دخول للحصول على اقتراحات مخصصة',
    badgeCurated: 'اكتشافات منتقاة من السوق',
    titlePart1: 'مقترح',
    titlePart2: 'لتصفحك القادم',
    note: {
      personalized: 'بنستخدم قائمة المفضلة وتصفحك الأخير وموقعك لما يكون متاح عشان نعرض لك أنسب المنتجات المتاحة.',
      fallback: 'بنعرض أحدث المنتجات المتاحة لحد ما نجمع إشارات أكتر عنك.',
      signedOut: 'سجّل دخول عشان نخصص اللي بتشوفه. حالياً بنعرض أحدث المنتجات.',
      sectionTrending: 'شوف المنتجات اللي عليها أكبر إقبال دلوقتي.',
      sectionNearby: 'استخدم موقعك عشان نعرض لك منتجات قريبة منك.',
      sectionAll: 'تصفح أحدث المنتجات المتاحة في كل الأقسام.',
    },
    filters: {
      forYou: 'مختار لك',
      forYouSignedOut: 'سجّل دخول لتخصيص هذه القائمة',
      forYouFallback: 'منتجات مختارة لحد ما نتعرف على ذوقك',
      forYouPersonalized: 'مزيج من نشاطك واهتماماتك المحفوظة',
      trending: 'الأكثر رواجاً',
      trendingDesc: 'إيه اللي عليه دوشة في السوق',
      nearby: 'قريب منك',
      nearbyDesc: 'منتجات قريبة من موقعك',
      nearbyDenied: 'تم رفض إذن الموقع',
      all: 'كل المنتجات',
      allDesc: 'أحدث المنتجات المتاحة في السوق',
    },
    viewMode: 'طريقة العرض:',
    viewCarousel: 'سلايدر',
    viewGrid: 'شبكة',
    loadingLocation: 'بنطلب الوصول لموقعك...',
    loadingItems: 'بنحمّل المنتجات...',
    noResultsTitle: 'مفيش منتجات',
    noResultsNearby: 'ملقيناش منتجات قريبة من منطقتك لسه. تقدر تتصفح السوق كله بدل كده.',
    noResultsRecommended: 'لسه عندنا إشارات قليلة عشان نقدر نقترح بدقة. جرّب تحفظ بعض المفضلات أو تتصفح منتجات أكتر الأول.',
    noResultsTrending: 'مفيش حاجة رائجة دلوقتي. ارجعلنا قريب.',
    noResultsDefault: 'مفيش منتجات متاحة في العرض ده دلوقتي.',
    browseAll: 'تصفح كل المنتجات',
    prevSlide: 'السابق',
    nextSlide: 'التالي',
    carouselLabel: 'سلايدر المنتجات المقترحة',
    goToSlide: 'انتقل إلى الشريحة',
    keepExploringTitle: 'عايز تكمّل تصفح؟',
    keepExploringBody: 'ادخل صفحة التصفح الكاملة عشان فلاتر أعمق، بحث محفوظ، وكل المنتجات المتاحة.',
    browseFull: 'تصفح المخزون الكامل',
    switchTrending: 'انتقل للرائج',
    additionalContext: 'القسم ده بيتأقلم على الإشارات اللي عندنا فعلاً. لما الإشارات قليلة، بيرجع لمنتجات السوق المختارة بدل ما يدّعي تخصيص عميق.',
    showingNItems: 'بنعرض {count} منتج في هذا العرض دلوقتي.',
  },
  recentlyViewed: {
    title: 'شوفته مؤخراً',
    refresh: 'تحديث',
  },
  featured: {
    badge: 'أحدث منتجات السوق',
    titleAccent: 'أحدث',
    titleRest: 'المنتجات للاستكشاف',
    subtitle: 'لقطة حية من المنتجات اللي اتضافت لسه من كل أنحاء السوق، بتتحدث مع كل منتج جديد.',
    statListings: 'منتجات معروضة',
    statCategories: 'أقسام مغطاة',
    statSellers: 'بائعين موثّقين معروضين',
    ctaTitle: 'جاهز تعرض حاجة خاصة بيك؟',
    ctaBody: 'ابدأ تبيع على Weggo وخلي منتجاتك قدام مشترين من كل أنحاء السوق.',
    ctaStart: 'ابدأ البيع',
    ctaBecome: 'كن بائعاً',
    ctaBrowse: 'تصفح المزيد',
  },
  howItWorks: {
    badge: 'إزاي بتشتغل',
    titlePart1: 'إزاي ',
    titlePart2: 'Weggo بتشتغل',
    subtitle: 'بسيطة، آمنة، وذكية — 4 خطوات سهلة للشراء والبيع',
    steps: {
      discover: {
        title: 'اكتشف',
        description: 'استخدم المساعد الذكي بتاعنا عشان تلاقي اللي محتاجه بظبط، أو تصفح اقتراحات مخصصة',
      },
      connect: {
        title: 'تواصل',
        description: 'كلّم البائعين مباشرة، اسأل، وفاصل على أحسن سعر',
      },
      deal: {
        title: 'اتفق',
        description: 'رتّب لقاء آمن في مكان عام واتمم عملية الشراء',
      },
      review: {
        title: 'قيّم',
        description: 'شارك تجربتك وساعد في بناء مجتمع موثوق',
      },
    },
    feature: {
      aiSearch: 'بحث بالذكاء الاصطناعي',
      smartFilters: 'فلاتر ذكية',
      personalizedFeed: 'قائمة مخصصة',
      secureMessaging: 'رسائل آمنة',
      realtimeChat: 'دردشة فورية',
      fileSharing: 'مشاركة ملفات',
      safeMeetups: 'لقاءات آمنة',
      securePayment: 'دفع آمن',
      escrowService: 'خدمة ضمان',
      rateSellers: 'تقييم البائعين',
      writeReviews: 'اكتب تقييمات',
      buildTrust: 'ابني ثقة',
    },
    stat: {
      items: '+2 مليون منتج',
      instantSupport: 'دعم فوري',
      secure: 'آمن 100%',
      averageStars: 'متوسط 4.8★',
    },
    ctaTitle: 'جاهز للبداية؟',
    ctaBody: 'انضم لآلاف المصريين اللي بيبيعوا ويشتروا على Weggo',
    ctaBuy: 'ابدأ الشراء',
    ctaSell: 'ابدأ البيع',
  },
  footer: {
    tagline: 'أذكى سوق في مصر لبيع وشراء المستعمل. مدعوم بالذكاء الاصطناعي.',
    pillAiPricing: 'تسعير ذكي',
    pillTrustedSellers: 'بائعون موثوقون',
    pillLocalDiscovery: 'اكتشاف محلي',
    quickLinks: 'روابط سريعة',
    linkHome: 'الرئيسية',
    linkBrowse: 'تصفح',
    linkSell: 'بيع',
    linkFavorites: 'المفضلة',
    linkSupport: 'الدعم',
    popularCategories: 'الأقسام الشائعة',
    standards: 'معايير السوق',
    standardCleaner: 'منتجات أنظف، تسعير أعدل، واكتشاف أسرع للمشترين والبائعين.',
    standardModeration: 'الإدارة، توثيق البائعين، ونظام التقييمات بيحافظوا على السوق متماسك قبل الإطلاق.',
    standardDocs: 'محتاج تفاصيل؟ ادخل مركز الدعم وإرشادات البائع والصفحات القانونية في الأسفل.',
    rights: 'جميع الحقوق محفوظة. صُنع بـ ❤️ في مصر',
    seller: 'إرشادات البائع',
    privacy: 'سياسة الخصوصية',
    terms: 'شروط الاستخدام',
  },
}

export const messages: Record<Locale, Messages> = { en, ar }
