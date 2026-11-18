import type { AppLanguage, ToolId } from '../types';

export interface Translations {
  nav: {
    home: string;
    tools: string;
    vault: string;
    settings: string;
  };
  common: {
    back: string;
    save: string;
    cancel: string;
    confirm: string;
    delete: string;
    open: string;
    share: string;
    print: string;
    lock: string;
    unlock: string;
    loadingVault: string;
    page: string;
    pages: string;
    locked: string;
  };
  home: {
    cameraScanTitle: string;
    cameraScanDesc: string;
    photoToPdfTitle: string;
    photoToPdfDesc: string;
    trustPoints: [string, string, string];
    recentSavedFiles: string;
    recentSubtitle: string;
    openVault: string;
    noSavedDocs: string;
    noSavedDocsHint: string;
    scanFirstDoc: string;
  };
  toolsHub: {
    title: string;
    subtitle: string;
    cards: Record<ToolId, { title: string; description: string }>;
  };
  vault: {
    title: string;
    filesLabel: string;
    fileLabel: string;
    storedLocally: string;
    exportZip: string;
    exportingZip: string;
    listView: string;
    gridView: string;
    layoutToggleLabel: string;
    searchPlaceholder: string;
    filterLabel: string;
    sortLabel: string;
    allFiles: string;
    noMatchesTitle: string;
    noMatchesClear: string;
    noMatchesEmpty: string;
    tagsBtn: string;
    selectMultiple: string;
    doneSelecting: string;
    selectedCount: string;
    selectAll: string;
    deselectAll: string;
    exportSelectedZip: string;
    confirmBulkDelete: string;
    renamePdf: string;
    renamePlaceholder: string;
    clearFilters: string;
  };
  settings: {
    title: string;
    subtitle: string;
    appearanceTitle: string;
    darkMode: string;
    darkModeActive: string;
    lightModeActive: string;
    localAlerts: string;
    localAlertsDesc: string;
    localAlertsDenied: string;
    localAlertsGranted: string;
    languageTitle: string;
    languageDesc: string;
    scanQualityTitle: string;
    scanQualityDesc: string;
    qualityHighHd: string;
    qualityHighHdSub: string;
    qualityBalanced: string;
    qualityBalancedSub: string;
    qualityCompact: string;
    qualityCompactSub: string;
    securitySectionTitle: string;
    pinLockTitle: string;
    pinLockActiveDesc: string;
    pinLockInactiveDesc: string;
    setPinPrompt: string;
    enterPinPlaceholder: string;
    confirmPinPlaceholder: string;
    saveEnablePin: string;
    changePin: string;
    lockAppNow: string;
    pinMismatchError: string;
    pinFormatError: string;
    dataPortabilityTitle: string;
    dataPortabilityDesc: string;
    exportZipBtn: string;
    packingZip: string;
    exportJsonBtn: string;
    exportingJson: string;
    restoreJsonBtn: string;
    shareSupportTitle: string;
    shareAppBtn: string;
    shareAppDesc: string;
    installPwaTitle: string;
    installPwaInstalled: string;
    installPwaIos: string;
    installPwaDefault: string;
    installNowBtn: string;
    privacyTitle: string;
    privacyBadge: string;
    privacyZeroLoginTitle: string;
    privacyZeroLoginBody: string;
    privacyZeroUploadsTitle: string;
    privacyZeroUploadsBody: string;
    privacyOwnershipTitle: string;
    privacyOwnershipBody: string;
    supportPrompt: string;
    contactSupportBtn: string;
  };
  pinScreen: {
    title: string;
    subtitle: string;
    wrongPin: string;
    clear: string;
    backspace: string;
    offlineBadge: string;
  };
}

const EN_TRANSLATIONS: Translations = {
  nav: {
    home: 'Home',
    tools: 'Tools Hub',
    vault: 'File Vault',
    settings: 'Settings',
  },
  common: {
    back: 'Back',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    open: 'Open',
    share: 'Share',
    print: 'Print',
    lock: 'Lock',
    unlock: 'Unlock',
    loadingVault: 'Loading offline File Vault...',
    page: 'page',
    pages: 'pages',
    locked: 'Locked',
  },
  home: {
    cameraScanTitle: 'Camera Doc Scan',
    cameraScanDesc: 'Scan with Magic Color & B&W Crisp',
    photoToPdfTitle: 'Photo to PDF',
    photoToPdfDesc: 'Combine photos into A4 or Auto PDF',
    trustPoints: [
      'No Login Required • 100% Free',
      'Your files never leave your phone (Zero server uploads)',
      'Full HD Quality • Direct WhatsApp Share',
    ],
    recentSavedFiles: 'Recent Saved Files',
    recentSubtitle: 'Stored privately in your on-device vault',
    openVault: 'Open Vault',
    noSavedDocs: 'No documents yet',
    noSavedDocsHint: 'Scan a receipt, ID, or invoice locally on your phone with zero server uploads.',
    scanFirstDoc: 'Scan Your First Document',
  },
  toolsHub: {
    title: 'Document Tools Hub',
    subtitle: 'All 8 tools run 100% locally on-device with zero uploads or login.',
    cards: {
      'camera-scan': { title: 'Camera Scanner', description: 'Magic Color, B&W Crisp & PDF' },
      'photo-to-pdf': { title: 'Photo to PDF', description: 'Reorder photos & A4/Auto PDF' },
      'merge-split': { title: 'Merge & Split', description: 'Combine PDFs or extract pages' },
      compress: { title: 'Compress PDF', description: 'High, Medium & Extreme presets' },
      'esign-lock': { title: 'E-Sign & Lock', description: 'Touch signature & password lock' },
      ocr: { title: 'OCR Text', description: 'Extract editable text & save TXT' },
      'pdf-to-jpg': { title: 'PDF to JPG', description: 'Export PDF pages as JPG images' },
      watermark: { title: 'Add Watermark', description: 'Stamp custom text across pages' },
    },
  },
  vault: {
    title: 'Offline File Vault',
    filesLabel: 'files',
    fileLabel: 'file',
    storedLocally: 'stored privately on device',
    exportZip: 'Export ZIP',
    exportingZip: 'Exporting ZIP...',
    listView: 'List',
    gridView: 'Grid',
    layoutToggleLabel: 'Vault layout',
    searchPlaceholder: 'Search files by name, type, or tag...',
    filterLabel: 'Filter by Tag / Type',
    sortLabel: 'Sort Order',
    allFiles: 'All Files',
    noMatchesTitle: 'No matching files in Vault',
    noMatchesClear: 'Try clearing your search query or switching the filter dropdown.',
    noMatchesEmpty: 'Create or scan a document to store it offline here.',
    tagsBtn: 'Tags',
    selectMultiple: 'Select Multiple',
    doneSelecting: 'Done',
    selectedCount: 'selected',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    exportSelectedZip: 'Export as ZIP',
    confirmBulkDelete: 'Delete selected?',
    renamePdf: 'Rename PDF',
    renamePlaceholder: 'Enter file name...',
    clearFilters: 'Clear Filters',
  },
  settings: {
    title: 'Settings & Privacy',
    subtitle: '100% Login-Free & Offline-First. Customize security, quality, language, and backups.',
    appearanceTitle: 'Preferences',
    darkMode: 'Dark Mode',
    darkModeActive: 'Dark slate interface active',
    lightModeActive: 'Crisp enterprise light mode active',
    localAlerts: 'Local Alerts (No Login Required)',
    localAlertsDesc: 'Get on-device alerts when PDFs are saved, compressed, or exported',
    localAlertsDenied: 'Browser permission blocked; using in-app alerts only',
    localAlertsGranted: 'Local notifications active for PDF saves, compression & backups',
    languageTitle: 'App Language',
    languageDesc: 'Switch interface labels between English and Hindi',
    scanQualityTitle: 'Default Scan Quality',
    scanQualityDesc: 'Controls resolution and compression for camera scans & photo PDFs',
    qualityHighHd: 'High HD',
    qualityHighHdSub: 'Full sharp clarity',
    qualityBalanced: 'Balanced',
    qualityBalancedSub: 'Crisp & fast',
    qualityCompact: 'Compact',
    qualityCompactSub: 'Smaller size',
    securitySectionTitle: 'Security & Privacy',
    pinLockTitle: 'App Security Lock (4-Digit PIN)',
    pinLockActiveDesc: '4-digit PIN protection active on app launch',
    pinLockInactiveDesc: 'Protect private PDFs with a 4-digit on-device PIN',
    setPinPrompt: 'Create a 4-digit PIN (stored hashed strictly on this device):',
    enterPinPlaceholder: '4-digit PIN',
    confirmPinPlaceholder: 'Confirm PIN',
    saveEnablePin: 'Save & Enable PIN',
    changePin: 'Change PIN',
    lockAppNow: 'Lock App Now',
    pinMismatchError: 'PINs do not match. Enter the same 4 digits twice.',
    pinFormatError: 'Enter a valid 4-digit numeric PIN (0-9).',
    dataPortabilityTitle: 'Vault Archive, Backup & Restore',
    dataPortabilityDesc: 'Export your entire File Vault as a standard ZIP archive or back up and restore anytime.',
    exportZipBtn: 'Export All PDFs (ZIP)',
    packingZip: 'Packing ZIP...',
    exportJsonBtn: 'Export Backup',
    exportingJson: 'Exporting...',
    restoreJsonBtn: 'Restore Backup',
    shareSupportTitle: 'Share PurePDF',
    shareAppBtn: 'Share PurePDF App',
    shareAppDesc: 'Invite friends & colleagues to scan PDFs 100% offline with zero ads tracking.',
    installPwaTitle: 'Install as Offline Mobile App',
    installPwaInstalled: 'Installed and running in standalone offline mode.',
    installPwaIos: 'On iPhone/iPad: tap Share in Safari and choose Add to Home Screen.',
    installPwaDefault: 'Add PurePDF to your home screen for instant offline launch.',
    installNowBtn: 'Install Now',
    privacyTitle: '100% Local On-Device Privacy Policy',
    privacyBadge: 'Zero Data Collection Guarantee',
    privacyZeroLoginTitle: 'Zero Data Collection & Zero Login:',
    privacyZeroLoginBody: 'PurePDF never requires an account, email sign-up, or cloud login. We collect zero analytics, zero usage telemetry, and zero personal identifiers.',
    privacyZeroUploadsTitle: 'Zero Server Uploads:',
    privacyZeroUploadsBody: 'Every document scan, JPG conversion, PDF merge, split, compression, watermark stamp, signature, password lock, and OCR extraction runs strictly on your device.',
    privacyOwnershipTitle: 'Full Ownership & On-Device Security:',
    privacyOwnershipBody: 'Your documents live privately inside your on-device File Vault, protected optionally with your 4-digit App PIN and AES-256-GCM file encryption.',
    supportPrompt: 'Questions, feedback, or app support? Reach us directly by email.',
    contactSupportBtn: 'Contact Support',
  },
  pinScreen: {
    title: 'Unlock PurePDF',
    subtitle: 'Enter your 4-digit App Security PIN',
    wrongPin: 'Incorrect PIN. Please try again.',
    clear: 'Clear',
    backspace: 'Delete',
    offlineBadge: '100% On-Device PIN Lock',
  },
};

const HI_TRANSLATIONS: Translations = {
  nav: {
    home: 'होम',
    tools: 'टूल्स हब',
    vault: 'फ़ाइल वॉल्ट',
    settings: 'सेटिंग्स',
  },
  common: {
    back: 'वापस',
    save: 'सेव',
    cancel: 'रद्द करें',
    confirm: 'पुष्टि करें',
    delete: 'हटाएं',
    open: 'खोलें',
    share: 'शेयर',
    print: 'प्रिंट',
    lock: 'लॉक',
    unlock: 'अनलॉक',
    loadingVault: 'ऑफ़लाइन फ़ाइल वॉल्ट लोड हो रहा है...',
    page: 'पेज',
    pages: 'पेज',
    locked: 'लॉक है',
  },
  home: {
    cameraScanTitle: 'कैमरा डॉक स्कैन',
    cameraScanDesc: 'मैजिक कलर और B&W क्रिस्प स्कैन',
    photoToPdfTitle: 'फ़ोटो से PDF',
    photoToPdfDesc: 'फ़ोटो को A4 या Auto PDF में बदलें',
    trustPoints: [
      'बिना लॉगिन • 100% मुफ़्त',
      'आपकी फ़ाइलें फोन से बाहर नहीं जातीं (ज़ीरो सर्वर अपलोड)',
      'फुल HD क्वालिटी • सीधा WhatsApp शेयर',
    ],
    recentSavedFiles: 'हाल की सेव फ़ाइलें',
    recentSubtitle: 'आपके डिवाइस के निजी ऑफ़लाइन वॉल्ट में सुरक्षित',
    openVault: 'वॉल्ट खोलें',
    noSavedDocs: 'अभी कोई सेव दस्तावेज़ नहीं है',
    noSavedDocsHint: 'बिना सर्वर अपलोड के अपने फोन पर रसीद, ID या बिल तुरंत स्कैन करें।',
    scanFirstDoc: 'अपना पहला दस्तावेज़ स्कैन करें',
  },
  toolsHub: {
    title: 'डॉक्यूमेंट टूल्स हब',
    subtitle: 'सभी 8 टूल्स बिना इंटरनेट और बिना लॉगिन के 100% आपके डिवाइस पर चलते हैं।',
    cards: {
      'camera-scan': { title: 'कैमरा स्कैनर', description: 'मैजिक कलर, B&W क्रिस्प और PDF' },
      'photo-to-pdf': { title: 'फ़ोटो से PDF', description: 'पेज क्रम बदलें और A4/Auto PDF' },
      'merge-split': { title: 'मर्ज और स्प्लिट', description: 'PDF जोड़ें या पेज निकालें' },
      compress: { title: 'PDF कंप्रेस करें', description: 'हाई, मीडियम और एक्स्ट्रीम विकल्प' },
      'esign-lock': { title: 'ई-साइन और लॉक', description: 'टच हस्ताक्षर और पासवर्ड लॉक' },
      ocr: { title: 'OCR टेक्स्ट', description: 'इमेज से टेक्स्ट निकालें और TXT सेव करें' },
      'pdf-to-jpg': { title: 'PDF से JPG', description: 'PDF पेज को JPG इमेज में बदलें' },
      watermark: { title: 'वॉटरमार्क जोड़ें', description: 'PDF पेजों पर कस्टम टेक्स्ट लगाएं' },
    },
  },
  vault: {
    title: 'ऑफ़लाइन फ़ाइल वॉल्ट',
    filesLabel: 'फ़ाइलें',
    fileLabel: 'फ़ाइल',
    storedLocally: 'डिवाइस पर निजी रूप से सुरक्षित',
    exportZip: 'ZIP एक्सपोर्ट',
    exportingZip: 'ZIP बन रही है...',
    listView: 'सूची',
    gridView: 'ग्रिड',
    layoutToggleLabel: 'वॉल्ट लेआउट',
    searchPlaceholder: 'नाम, प्रकार या टैग से फ़ाइल खोजें...',
    filterLabel: 'टैग / प्रकार से फ़िल्टर',
    sortLabel: 'क्रम चुनें',
    allFiles: 'सभी फ़ाइलें',
    noMatchesTitle: 'वॉल्ट में कोई मेल खाती फ़ाइल नहीं मिली',
    noMatchesClear: 'खोज शब्द साफ़ करें या फ़िल्टर बदलकर देखें।',
    noMatchesEmpty: 'ऑफ़लाइन सेव करने के लिए नया दस्तावेज़ स्कैन या तैयार करें।',
    tagsBtn: 'टैग',
    selectMultiple: 'एकाधिक चुनें',
    doneSelecting: 'पूर्ण',
    selectedCount: 'चयनित',
    selectAll: 'सभी चुनें',
    deselectAll: 'चयन हटाएं',
    exportSelectedZip: 'ZIP एक्सपोर्ट',
    confirmBulkDelete: 'चयनित हटाएं?',
    renamePdf: 'PDF का नाम बदलें',
    renamePlaceholder: 'फ़ाइल का नाम लिखें...',
    clearFilters: 'फ़िल्टर साफ़ करें',
  },
  settings: {
    title: 'सेटिंग्स और गोपनीयता',
    subtitle: '100% लॉगिन-मुक्त और ऑफ़लाइन। सुरक्षा, स्कैन क्वालिटी, भाषा और बैकअप नियंत्रित करें।',
    appearanceTitle: 'ऐप प्राथमिकताएं',
    darkMode: 'डार्क मोड',
    darkModeActive: 'डार्क स्लेट थीम सक्रिय है',
    lightModeActive: 'साफ़ लाइट थीम सक्रिय है',
    localAlerts: 'लोकल अलर्ट (बिना लॉगिन)',
    localAlertsDesc: 'PDF सेव, कंप्रेस या एक्सपोर्ट होने पर डिवाइस पर सूचना पाएं',
    localAlertsDenied: 'ब्राउज़र अनुमति बंद है; इन-ऐप अलर्ट सक्रिय हैं',
    localAlertsGranted: 'PDF सेव, कंप्रेस और बैकअप के लिए लोकल अलर्ट चालू हैं',
    languageTitle: 'ऐप की भाषा',
    languageDesc: 'ऐप के सभी विकल्प English और हिंदी में बदलें',
    scanQualityTitle: 'डिफ़ॉल्ट स्कैन क्वालिटी',
    scanQualityDesc: 'कैमरा स्कैन और फ़ोटो से PDF एक्सपोर्ट की स्पष्टता और साइज़ चुनें',
    qualityHighHd: 'High HD',
    qualityHighHdSub: 'फुल स्पष्ट क्वालिटी',
    qualityBalanced: 'Balanced',
    qualityBalancedSub: 'संतुलित और तेज़',
    qualityCompact: 'Compact',
    qualityCompactSub: 'कम फ़ाइल साइज़',
    securitySectionTitle: 'सुरक्षा और गोपनीयता',
    pinLockTitle: 'ऐप सुरक्षा लॉक (4-अंकों का PIN)',
    pinLockActiveDesc: 'ऐप खोलने पर 4-अंकों का PIN लॉक सक्रिय है',
    pinLockInactiveDesc: 'अपनी निजी PDF फ़ाइलों को 4-अंकों के PIN से सुरक्षित रखें',
    setPinPrompt: '4-अंकों का नया PIN चुनें (केवल इसी डिवाइस पर सुरक्षित रहता है):',
    enterPinPlaceholder: '4-अंकों का PIN',
    confirmPinPlaceholder: 'PIN दोहराएं',
    saveEnablePin: 'PIN सेव और चालू करें',
    changePin: 'PIN बदलें',
    lockAppNow: 'अभी लॉक करें',
    pinMismatchError: 'दोनों PIN मेल नहीं खाए। कृपया एक जैसे 4 अंक दर्ज करें।',
    pinFormatError: 'कृपया 4 अंकों का मान्य PIN (0-9) दर्ज करें।',
    dataPortabilityTitle: 'वॉल्ट आर्काइव, बैकअप और रीस्टोर',
    dataPortabilityDesc: 'अपना पूरा फ़ाइल वॉल्ट ZIP के रूप में डाउनलोड करें या बैकअप सेव रखें।',
    exportZipBtn: 'सभी PDF एक्सपोर्ट करें (ZIP)',
    packingZip: 'ZIP तैयार हो रही है...',
    exportJsonBtn: 'बैकअप एक्सपोर्ट',
    exportingJson: 'एक्सपोर्ट हो रहा है...',
    restoreJsonBtn: 'बैकअप रीस्टोर करें',
    shareSupportTitle: 'ऐप शेयर करें',
    shareAppBtn: 'PurePDF ऐप शेयर करें',
    shareAppDesc: 'दोस्तों को 100% ऑफ़लाइन और बिना लॉगिन PDF स्कैनिंग के लिए आमंत्रित करें।',
    installPwaTitle: 'ऑफ़लाइन मोबाइल ऐप इंस्टॉल करें',
    installPwaInstalled: 'ऐप स्टैंडअलोन ऑफ़लाइन मोड में इंस्टॉल है।',
    installPwaIos: 'iPhone/iPad पर: Safari में Share दबाएं और Add to Home Screen चुनें।',
    installPwaDefault: 'तुरंत ऑफ़लाइन उपयोग के लिए PurePDF को होम स्क्रीन पर जोड़ें।',
    installNowBtn: 'अभी इंस्टॉल करें',
    privacyTitle: '100% ऑन-डिवाइस गोपनीयता नीति',
    privacyBadge: 'ज़ीरो डेटा कलेक्शन गारंटी',
    privacyZeroLoginTitle: 'कोई डेटा संग्रह नहीं और कोई लॉगिन नहीं:',
    privacyZeroLoginBody: 'PurePDF में कभी खाता, ईमेल या क्लाउड लॉगिन की आवश्यकता नहीं होती। हम कोई एनालिटिक्स या व्यक्तिगत जानकारी एकत्र नहीं करते।',
    privacyZeroUploadsTitle: 'ज़ीरो सर्वर अपलोड:',
    privacyZeroUploadsBody: 'हर दस्तावेज़ स्कैन, JPG रूपांतरण, PDF मर्ज, स्प्लिट, कम्प्रेशन, वॉटरमार्क, हस्ताक्षर, पासवर्ड लॉक और OCR केवल आपके फोन पर ही प्रोसेस होता है।',
    privacyOwnershipTitle: 'पूर्ण स्वामित्व और सुरक्षा:',
    privacyOwnershipBody: 'आपकी सभी फ़ाइलें आपके डिवाइस के निजी वॉल्ट में रहती हैं और 4-अंकों के ऐप PIN व AES-256 एन्क्रिप्शन से सुरक्षित रहती हैं।',
    supportPrompt: 'सहायता या सुझाव के लिए सीधे ईमेल द्वारा संपर्क करें।',
    contactSupportBtn: 'सपोर्ट से संपर्क करें',
  },
  pinScreen: {
    title: 'PurePDF अनलॉक करें',
    subtitle: 'अपना 4-अंकों का ऐप सुरक्षा PIN दर्ज करें',
    wrongPin: 'गलत PIN। कृपया पुनः प्रयास करें।',
    clear: 'साफ़ करें',
    backspace: 'हटाएं',
    offlineBadge: '100% ऑन-डिवाइस PIN लॉक',
  },
};

export function getTranslations(lang: AppLanguage): Translations {
  return lang === 'hi' ? HI_TRANSLATIONS : EN_TRANSLATIONS;
}
