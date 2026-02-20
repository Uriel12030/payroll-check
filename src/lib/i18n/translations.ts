export type Language = 'he' | 'en' | 'ru' | 'am'

export const LANGUAGES: { code: Language; label: string; dir: 'rtl' | 'ltr' }[] = [
  { code: 'he', label: 'עברית', dir: 'rtl' },
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ru', label: 'Русский', dir: 'ltr' },
  { code: 'am', label: 'አማርኛ', dir: 'ltr' },
]

export function getLangDir(lang: Language): 'rtl' | 'ltr' {
  return lang === 'he' ? 'rtl' : 'ltr'
}

const translations: Record<string, Record<Language, string>> = {
  // Header / Nav
  'nav.how_it_works': {
    he: 'איך זה עובד',
    en: 'How it works',
    ru: 'Как это работает',
    am: 'እንዴት ይሰራል',
  },
  'nav.what_we_check': {
    he: 'מה בודקים',
    en: 'What we check',
    ru: 'Что проверяем',
    am: 'ምን እንፈትሻለን',
  },
  'nav.free_check': {
    he: 'בדיקה חינם',
    en: 'Free check',
    ru: 'Бесплатная проверка',
    am: 'ነፃ ምርመራ',
  },

  // Hero
  'hero.badge': {
    he: '✓ ללא עלות · ללא התחייבות',
    en: '✓ Free · No obligation',
    ru: '✓ Бесплатно · Без обязательств',
    am: '✓ ነፃ · ያለ ግዴታ',
  },
  'hero.title_line1': {
    he: 'האם מגיע לכם כסף',
    en: 'Is your employer',
    ru: 'Должен ли вам',
    am: 'ቀጣሪዎ ገንዘብ',
  },
  'hero.title_line2': {
    he: ' מהמעסיק?',
    en: ' owing you money?',
    ru: ' работодатель?',
    am: ' ይፈልግዎታል?',
  },
  'hero.subtitle': {
    he: 'מילאתם שנים של עבודה – בדקו אם קיבלתם את כל המגיע לכם: שעות נוספות, פנסיה, פיצויים, חופשה ועוד.',
    en: 'You worked for years — check if you received everything you deserve: overtime, pension, severance, vacation and more.',
    ru: 'Вы работали годами — проверьте, получили ли вы всё, что вам положено: сверхурочные, пенсия, компенсации, отпуск и другое.',
    am: 'ዓመታት ሰርተዋል — የሚገባዎትን ሁሉ ማግኘትዎን ያረጋግጡ፡ ተጨማሪ ሰዓት፣ ጡረታ፣ ካሳ፣ ዕረፍት እና ሌሎችም።',
  },
  'hero.cta': {
    he: 'התחילו בדיקה חינם ←',
    en: 'Start free check →',
    ru: 'Начать бесплатную проверку →',
    am: 'ነፃ ምርመራ ይጀምሩ →',
  },
  'hero.disclaimer': {
    he: 'בדיקה ממוחשבת בלבד. אינה מהווה ייעוץ משפטי.',
    en: 'Automated check only. Not legal advice.',
    ru: 'Только автоматическая проверка. Не является юридической консультацией.',
    am: 'በኮምፒውተር የሚደረግ ምርመራ ብቻ። የሕግ ምክር አይደለም።',
  },

  // How it works
  'how.title': {
    he: 'איך זה עובד?',
    en: 'How does it work?',
    ru: 'Как это работает?',
    am: 'እንዴት ይሰራል?',
  },
  'how.step1_title': {
    he: 'מלאו פרטים',
    en: 'Fill in details',
    ru: 'Заполните данные',
    am: 'ዝርዝሮችን ይሙሉ',
  },
  'how.step1_desc': {
    he: 'שאלון קצר על תנאי העסקתכם – 5 דקות בלבד',
    en: 'Short questionnaire about your employment — only 5 minutes',
    ru: 'Короткая анкета об условиях вашей работы — всего 5 минут',
    am: 'ስለ ሥራ ሁኔታዎ አጭር መጠይቅ — 5 ደቂቃ ብቻ',
  },
  'how.step2_title': {
    he: 'העלו מסמכים',
    en: 'Upload documents',
    ru: 'Загрузите документы',
    am: 'ሰነዶችን ያስገቡ',
  },
  'how.step2_desc': {
    he: 'תלושי שכר, חוזה עבודה או כל מסמך רלוונטי',
    en: 'Pay slips, employment contract or any relevant document',
    ru: 'Расчётные листки, трудовой договор или любой релевантный документ',
    am: 'የደመወዝ ስሊፕ፣ የሥራ ውል ወይም ማንኛውም ተዛማጅ ሰነድ',
  },
  'how.step3_title': {
    he: 'קבלו תשובה',
    en: 'Get an answer',
    ru: 'Получите ответ',
    am: 'መልስ ያግኙ',
  },
  'how.step3_desc': {
    he: 'עורך דין יבדוק ויחזור אליכם תוך 48 שעות',
    en: 'A lawyer will review and get back to you within 48 hours',
    ru: 'Адвокат проверит и свяжется с вами в течение 48 часов',
    am: 'ጠበቃ ይገመግማል በ48 ሰዓታት ውስጥ ይመልስልዎታል',
  },

  // Benefits
  'benefits.title': {
    he: 'מה הבדיקה כוללת?',
    en: 'What does the check include?',
    ru: 'Что включает проверка?',
    am: 'ምርመራው ምን ያካትታል?',
  },
  'benefits.overtime_title': {
    he: 'שעות נוספות',
    en: 'Overtime',
    ru: 'Сверхурочные',
    am: 'ተጨማሪ ሰዓት',
  },
  'benefits.overtime_desc': {
    he: 'בדקו אם קיבלתם תגמול מלא עבור שעות עבודה מעבר לנורמה',
    en: 'Check if you received full compensation for overtime hours',
    ru: 'Проверьте, получили ли вы полную оплату за сверхурочные часы',
    am: 'ለተጨማሪ ሰዓት ሙሉ ክፍያ ማግኘትዎን ያረጋግጡ',
  },
  'benefits.pension_title': {
    he: 'פנסיה ורווחה',
    en: 'Pension & benefits',
    ru: 'Пенсия и льготы',
    am: 'ጡረታ እና ጥቅማጥቅሞች',
  },
  'benefits.pension_desc': {
    he: 'וודאו שהמעסיק הפריש לפנסיה ולביטוח לאומי כנדרש',
    en: 'Verify your employer contributed to pension and social security as required',
    ru: 'Убедитесь, что работодатель отчислял в пенсионный фонд и социальное страхование',
    am: 'ቀጣሪዎ ለጡረታ እና ለማህበራዊ ዋስትና እንደሚገባው መዋጮ ማድረጉን ያረጋግጡ',
  },
  'benefits.severance_title': {
    he: 'פיצויים',
    en: 'Severance',
    ru: 'Компенсации',
    am: 'ካሳ',
  },
  'benefits.severance_desc': {
    he: 'בדקו זכאות לפיצויי פיטורים, דמי הודעה מוקדמת ועוד',
    en: 'Check eligibility for severance pay, notice period compensation and more',
    ru: 'Проверьте право на выходное пособие, компенсацию за предупреждение и другое',
    am: 'ለካሳ፣ ለማስጠንቀቂያ ጊዜ ክፍያ እና ሌሎችም ብቁ መሆንዎን ያረጋግጡ',
  },
  'benefits.vacation_title': {
    he: 'חופשה ומחלה',
    en: 'Vacation & sick days',
    ru: 'Отпуск и больничные',
    am: 'ዕረፍት እና የታመሙ ቀናት',
  },
  'benefits.vacation_desc': {
    he: 'בדקו אם ניצלתם את מלוא ימי החופשה והמחלה המגיעים לכם',
    en: 'Check if you used all vacation and sick days you were entitled to',
    ru: 'Проверьте, использовали ли вы все положенные дни отпуска и больничного',
    am: 'የሚገባዎትን ሁሉንም የዕረፍት እና የታመሙ ቀናት መጠቀምዎን ያረጋግጡ',
  },

  // Bottom CTA
  'cta.title': {
    he: 'מוכנים לבדוק?',
    en: 'Ready to check?',
    ru: 'Готовы проверить?',
    am: 'ለመፈተሽ ዝግጁ ነዎት?',
  },
  'cta.subtitle': {
    he: 'מאות עובדים כבר גילו שמגיע להם תשלום שלא קיבלו. הבדיקה חינם ולוקחת 5 דקות.',
    en: 'Hundreds of workers already discovered they were owed money. The check is free and takes 5 minutes.',
    ru: 'Сотни работников уже обнаружили, что им должны деньги. Проверка бесплатна и занимает 5 минут.',
    am: 'በመቶዎች የሚቆጠሩ ሰራተኞች ገንዘብ እንደሚገባቸው ደርሰውበታል። ምርመራው ነፃ ሲሆን 5 ደቂቃ ይወስዳል።',
  },
  'cta.button': {
    he: 'התחילו עכשיו – חינם',
    en: 'Start now — free',
    ru: 'Начните сейчас — бесплатно',
    am: 'አሁን ይጀምሩ — ነፃ',
  },

  // Footer
  'footer.subtitle': {
    he: 'בדיקת זכויות עובדים – ממוחשבת ומהירה',
    en: 'Employee rights check — automated and fast',
    ru: 'Проверка прав работников — автоматическая и быстрая',
    am: 'የሰራተኞች መብት ምርመራ — በኮምፒውተር እና ፈጣን',
  },
  'footer.disclaimer': {
    he: 'הבדיקה היא ממוחשבת בלבד ואינה מהווה ייעוץ משפטי. הפנייה לעורך דין כפופה לתנאי השירות.',
    en: 'The check is automated only and does not constitute legal advice. Referral to a lawyer is subject to terms of service.',
    ru: 'Проверка является только автоматической и не является юридической консультацией. Направление к адвокату подчиняется условиям обслуживания.',
    am: 'ምርመራው በኮምፒውተር ብቻ የሚደረግ ሲሆን የሕግ ምክር አይደለም። ወደ ጠበቃ መላክ በአገልግሎት ውሉ መሰረት ነው።',
  },

  // Quick Start wizard
  'qs.title': {
    he: 'כמה שאלות קצרות לפני שנתחיל',
    en: 'A few quick questions before we start',
    ru: 'Несколько быстрых вопросов перед началом',
    am: 'ከመጀመራችን በፊት ጥቂት ፈጣን ጥያቄዎች',
  },

  // Q1 - Years with employer
  'qs.q1_title': {
    he: 'כמה זמן עבדתם אצל המעסיק?',
    en: 'How long have you worked with this employer?',
    ru: 'Сколько лет вы работаете/работали у этого работодателя?',
    am: 'ከዚህ ቀጣሪ ጋር ምን ያህል ጊዜ ሰርተዋል?',
  },
  'qs.q1_opt1': {
    he: 'פחות משנה',
    en: 'Less than 1 year',
    ru: 'Менее 1 года',
    am: 'ከ1 ዓመት በታች',
  },
  'qs.q1_opt2': {
    he: '1–3 שנים',
    en: '1–3 years',
    ru: '1–3 года',
    am: '1–3 ዓመታት',
  },
  'qs.q1_opt3': {
    he: '3–7 שנים',
    en: '3–7 years',
    ru: '3–7 лет',
    am: '3–7 ዓመታት',
  },
  'qs.q1_opt4': {
    he: '7+ שנים',
    en: '7+ years',
    ru: '7+ лет',
    am: '7+ ዓመታት',
  },

  // Q2 - Employment type
  'qs.q2_title': {
    he: 'סוג ההעסקה',
    en: 'Employment type',
    ru: 'Тип занятости',
    am: 'የቅጥር ዓይነት',
  },
  'qs.q2_opt1': {
    he: 'העסקה ישירה',
    en: 'Direct employee',
    ru: 'Прямое трудоустройство',
    am: 'ቀጥተኛ ሠራተኛ',
  },
  'qs.q2_opt2': {
    he: 'עובד קבלן / חברת כח אדם',
    en: 'Contractor via manpower company',
    ru: 'Через кадровое агентство / подрядчик',
    am: 'በሰው ኃይል ኩባንያ በኩል ተቋራጭ',
  },
  'qs.q2_opt3': {
    he: 'לא בטוח/ה',
    en: 'Not sure',
    ru: 'Не уверен(а)',
    am: 'እርግጠኛ አይደለሁም',
  },

  // Q3 - Main issues
  'qs.q3_title': {
    he: 'מה הנושא העיקרי? (בחרו עד 2)',
    en: 'Main issue? (choose up to 2)',
    ru: 'Основная проблема? (выберите до 2)',
    am: 'ዋና ጉዳይ? (እስከ 2 ይምረጡ)',
  },
  'qs.q3_opt1': {
    he: 'שעות נוספות לא שולמו',
    en: 'Unpaid overtime',
    ru: 'Неоплаченные сверхурочные',
    am: 'ያልተከፈለ ተጨማሪ ሰዓት',
  },
  'qs.q3_opt2': {
    he: 'פיצויים / זכויות פיטורים',
    en: 'Severance / dismissal rights',
    ru: 'Компенсация / права при увольнении',
    am: 'ካሳ / የስንብት መብቶች',
  },
  'qs.q3_opt3': {
    he: 'חופשה / ימי מחלה',
    en: 'Vacation / sick days',
    ru: 'Отпуск / больничные дни',
    am: 'ዕረፍት / የታመሙ ቀናት',
  },
  'qs.q3_opt4': {
    he: 'פנסיה / הטבות',
    en: 'Pension / benefits',
    ru: 'Пенсия / льготы',
    am: 'ጡረታ / ጥቅማጥቅሞች',
  },
  'qs.q3_opt5': {
    he: 'תלושים / תשלומים חסרים',
    en: 'Pay slips / missing payments',
    ru: 'Расчётные листки / недостающие выплаты',
    am: 'የደመወዝ ስሊፕ / ያልተገኙ ክፍያዎች',
  },
  'qs.q3_opt6': {
    he: 'אחר',
    en: 'Other',
    ru: 'Другое',
    am: 'ሌላ',
  },

  // Q4 - Preferred email language
  'qs.q4_title': {
    he: 'באיזו שפה תעדיפו לקבל מיילים?',
    en: 'In which language would you prefer to receive emails?',
    ru: 'На каком языке вы предпочитаете получать электронные письма?',
    am: 'በየትኛው ቋንቋ ኢሜይሎችን መቀበል ይፈልጋሉ?',
  },

  // Quick start nav
  'qs.continue': {
    he: 'המשך',
    en: 'Continue',
    ru: 'Продолжить',
    am: 'ቀጥል',
  },
  'qs.back': {
    he: 'חזרה',
    en: 'Back',
    ru: 'Назад',
    am: 'ተመለስ',
  },
  'qs.next': {
    he: 'הבא',
    en: 'Next',
    ru: 'Далее',
    am: 'ቀጣይ',
  },
  'qs.step_of': {
    he: 'שאלה {current} מתוך {total}',
    en: 'Question {current} of {total}',
    ru: 'Вопрос {current} из {total}',
    am: 'ጥያቄ {current} ከ {total}',
  },

  // Intake page
  'intake.subtitle': {
    he: 'בדיקת זכויות עובדים – חינם ומהיר',
    en: 'Employee rights check — free and fast',
    ru: 'Проверка прав работников — бесплатно и быстро',
    am: 'የሰራተኞች መብት ምርመራ — ነፃ እና ፈጣን',
  },
  'intake.disclaimer': {
    he: 'הבדיקה ממוחשבת בלבד ואינה ייעוץ משפטי. פרטיך מוצפנים ומאובטחים.',
    en: 'Automated check only, not legal advice. Your details are encrypted and secure.',
    ru: 'Только автоматическая проверка, не юридическая консультация. Ваши данные зашифрованы и защищены.',
    am: 'በኮምፒውተር የሚደረግ ምርመራ ብቻ፣ የሕግ ምክር አይደለም። ዝርዝሮችዎ የተመሰጠሩ እና ደህንነታቸው የተጠበቀ ነው።',
  },
}

export function t(key: string, lang: Language, vars?: Record<string, string>): string {
  const entry = translations[key]
  if (!entry) return key
  let text = entry[lang] ?? entry['he'] ?? key
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v)
    })
  }
  return text
}
