/* בנקי הקטגוריות וטקסטים של הממשק */
(function (root) {
  'use strict';

  var BANKS = {
    he: {
      easy: [
        { name: 'צבעים',        words: ['אדום', 'כחול', 'ירוק', 'צהוב', 'שחור', 'לבן'] },
        { name: 'חיות בית',     words: ['כלב', 'חתול', 'תוכי', 'אוגר', 'ארנב'] },
        { name: 'חיות בר',      words: ['אריה', 'פיל', 'זברה', 'קוף', 'נמר', 'דוב'] },
        { name: 'פירות',        words: ['תפוח', 'בננה', 'ענבים', 'אגס', 'אבטיח', 'שזיף'] },
        { name: 'ירקות',        words: ['גזר', 'מלפפון', 'עגבנייה', 'בצל', 'חסה', 'תירס'] },
        { name: 'ימות השבוע',   words: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] },
        { name: 'תחבורה',       words: ['אוטובוס', 'רכבת', 'מטוס', 'אופניים', 'מונית', 'אונייה'] },
        { name: 'איברי הגוף',   words: ['ראש', 'יד', 'רגל', 'עין', 'אוזן', 'אף', 'פה'] },
        { name: 'בגדים',        words: ['חולצה', 'מכנסיים', 'מעיל', 'כובע', 'נעליים', 'גרביים'] },
        { name: 'רהיטים',       words: ['שולחן', 'כיסא', 'ספה', 'מיטה', 'ארון', 'מדף'] },
        { name: 'כלי מטבח',     words: ['סיר', 'מחבת', 'סכין', 'מזלג', 'כף', 'צלחת'] },
        { name: 'מזג אוויר',    words: ['גשם', 'שלג', 'שמש', 'רוח', 'ענן'] },
        { name: 'משפחה',        words: ['אבא', 'אימא', 'אח', 'אחות', 'סבא', 'סבתא'] },
        { name: 'בית',          words: ['דלת', 'חלון', 'גג', 'מדרגות', 'מרפסת'] }
      ],
      medium: [
        { name: 'כלי נגינה',    words: ['כינור', 'חליל', 'תוף', 'פסנתר', 'גיטרה'] },
        { name: 'מקצועות',      words: ['רופא', 'מורה', 'נגר', 'טייס', 'שופט', 'אופה'] },
        { name: 'ערים בישראל',  words: ['ירושלים', 'חיפה', 'אילת', 'צפת', 'טבריה', 'אשדוד'] },
        { name: 'מדינות',       words: ['צרפת', 'יפן', 'ברזיל', 'מצרים', 'קנדה', 'הודו'] },
        { name: 'ענפי ספורט',   words: ['כדורסל', 'שחייה', 'טניס', 'ריצה', 'גלישה'] },
        { name: 'כלי עבודה',    words: ['פטיש', 'מברג', 'מסור', 'מקדחה', 'מפתח'] },
        { name: 'פרחים',        words: ['ורד', 'חמנייה', 'סחלב', 'נרקיס', 'רקפת'] },
        { name: 'עצים',         words: ['אורן', 'זית', 'ברוש', 'דקל', 'אלון'] },
        { name: 'ציפורים',      words: ['דרור', 'יונה', 'עורב', 'ינשוף', 'נשר'] },
        { name: 'חיות ים',      words: ['כריש', 'דולפין', 'מדוזה', 'סרטן', 'תמנון'] },
        { name: 'רגשות',        words: ['שמחה', 'עצב', 'פחד', 'כעס', 'גאווה'] },
        { name: 'חגים',         words: ['פסח', 'סוכות', 'חנוכה', 'פורים', 'שבועות'] },
        { name: 'כלי כתיבה',    words: ['עיפרון', 'עט', 'מחק', 'מחברת'] },
        { name: 'מאכלים',       words: ['פיצה', 'חומוס', 'פלאפל', 'שניצל', 'סלט'] },
        { name: 'תבלינים',      words: ['פלפל', 'כמון', 'קינמון', 'פפריקה', 'זעתר'] },
        { name: 'חומרי בניין',  words: ['בטון', 'לבנה', 'זכוכית', 'עץ', 'טיח'] }
      ],
      hard: [
        { name: 'פירות הדר',    words: ['תפוז', 'לימון', 'אשכולית'] },
        { name: 'פירות יער',    words: ['תות', 'פטל', 'אוכמנית'] },
        { name: 'ירקות שורש',   words: ['גזר', 'צנון', 'סלק'] },
        { name: 'קטניות',       words: ['עדשים', 'חומוס', 'שעועית', 'אפונה'] },
        { name: 'כלי נשיפה',    words: ['חליל', 'חצוצרה', 'קלרינט'] },
        { name: 'כלי מיתר',     words: ['כינור', 'גיטרה', 'נבל', 'צֶלו'] },
        { name: 'כלי הקשה',     words: ['תוף', 'פעמון', 'מצילתיים'] },
        { name: 'כוכבי לכת',    words: ['נוגה', 'מאדים', 'צדק', 'שבתאי'] },
        { name: 'מתכות',        words: ['ברזל', 'נחושת', 'כסף', 'זהב'] },
        { name: 'אבני חן',      words: ['יהלום', 'אודם', 'ספיר'] },
        { name: 'רוחות השמיים', words: ['צפון', 'דרום', 'מזרח', 'מערב'] },
        { name: 'מצבי צבירה',   words: ['מוצק', 'נוזל', 'גז'] },
        { name: 'יבשות',        words: ['אסיה', 'אפריקה', 'אירופה', 'אוסטרליה'] },
        { name: 'אוקיינוסים',   words: ['אטלנטי', 'שקט', 'הודי'] },
        { name: 'יחידות מידה',  words: ['גרם', 'מטר', 'ליטר', 'שנייה'] },
        { name: 'צורות',        words: ['עיגול', 'ריבוע', 'משולש', 'מלבן'] },
        { name: 'חושים',        words: ['ראייה', 'שמיעה', 'ריח', 'טעם', 'מישוש'] },
        { name: 'ממלכות הטבע',  words: ['צומח', 'חי', 'דומם'] }
      ]
    },

    en: {
      easy: [
        { name: 'Colours',      words: ['red', 'blue', 'green', 'yellow', 'black', 'white'] },
        { name: 'Pets',         words: ['dog', 'cat', 'parrot', 'hamster', 'rabbit'] },
        { name: 'Wild animals', words: ['lion', 'elephant', 'zebra', 'monkey', 'tiger', 'bear'] },
        { name: 'Fruit',        words: ['apple', 'banana', 'grapes', 'pear', 'melon', 'plum'] },
        { name: 'Vegetables',   words: ['carrot', 'cucumber', 'tomato', 'onion', 'lettuce', 'corn'] },
        { name: 'Weekdays',     words: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
        { name: 'Transport',    words: ['bus', 'train', 'plane', 'bicycle', 'taxi', 'ship'] },
        { name: 'Body parts',   words: ['head', 'hand', 'foot', 'eye', 'ear', 'nose', 'mouth'] },
        { name: 'Clothes',      words: ['shirt', 'trousers', 'coat', 'hat', 'shoes', 'socks'] },
        { name: 'Furniture',    words: ['table', 'chair', 'sofa', 'bed', 'wardrobe', 'shelf'] },
        { name: 'Kitchen',      words: ['pot', 'pan', 'knife', 'fork', 'spoon', 'plate'] },
        { name: 'Weather',      words: ['rain', 'snow', 'sun', 'wind', 'cloud'] },
        { name: 'Family',       words: ['father', 'mother', 'brother', 'sister', 'grandfather', 'grandmother'] },
        { name: 'The house',    words: ['door', 'window', 'roof', 'stairs', 'balcony'] }
      ],
      medium: [
        { name: 'Instruments',  words: ['violin', 'flute', 'drum', 'piano', 'guitar'] },
        { name: 'Jobs',         words: ['doctor', 'teacher', 'carpenter', 'pilot', 'judge', 'baker'] },
        { name: 'Countries',    words: ['France', 'Japan', 'Brazil', 'Egypt', 'Canada', 'India'] },
        { name: 'Capitals',     words: ['Paris', 'Tokyo', 'Lisbon', 'Cairo', 'Ottawa'] },
        { name: 'Sports',       words: ['basketball', 'swimming', 'tennis', 'running', 'surfing'] },
        { name: 'Tools',        words: ['hammer', 'screwdriver', 'saw', 'drill', 'wrench'] },
        { name: 'Flowers',      words: ['rose', 'sunflower', 'orchid', 'daffodil', 'tulip'] },
        { name: 'Trees',        words: ['pine', 'olive', 'cypress', 'palm', 'oak'] },
        { name: 'Birds',        words: ['sparrow', 'dove', 'crow', 'owl', 'eagle'] },
        { name: 'Sea life',     words: ['shark', 'dolphin', 'jellyfish', 'crab', 'octopus'] },
        { name: 'Feelings',     words: ['joy', 'sadness', 'fear', 'anger', 'pride'] },
        { name: 'Dishes',       words: ['pizza', 'soup', 'salad', 'omelette', 'pasta'] },
        { name: 'Stationery',   words: ['pencil', 'pen', 'eraser', 'notebook'] },
        { name: 'Spices',       words: ['pepper', 'cumin', 'cinnamon', 'paprika', 'ginger'] },
        { name: 'Building',     words: ['concrete', 'brick', 'glass', 'timber', 'plaster'] }
      ],
      hard: [
        { name: 'Citrus',       words: ['orange', 'lemon', 'grapefruit'] },
        { name: 'Berries',      words: ['raspberry', 'blueberry', 'blackberry'] },
        { name: 'Root veg',     words: ['beet', 'radish', 'turnip'] },
        { name: 'Legumes',      words: ['lentils', 'chickpeas', 'beans', 'peas'] },
        { name: 'Woodwind',     words: ['flute', 'clarinet', 'oboe'] },
        { name: 'Strings',      words: ['violin', 'guitar', 'harp', 'cello'] },
        { name: 'Percussion',   words: ['drum', 'bell', 'cymbals'] },
        { name: 'Planets',      words: ['Venus', 'Mars', 'Jupiter', 'Saturn'] },
        { name: 'Metals',       words: ['iron', 'copper', 'silver', 'gold'] },
        { name: 'Gemstones',    words: ['diamond', 'ruby', 'sapphire'] },
        { name: 'Compass',      words: ['north', 'south', 'east', 'west'] },
        { name: 'States',       words: ['solid', 'liquid', 'gas'] },
        { name: 'Continents',   words: ['Asia', 'Africa', 'Europe', 'Australia'] },
        { name: 'Oceans',       words: ['Atlantic', 'Pacific', 'Indian'] },
        { name: 'Units',        words: ['gram', 'metre', 'litre', 'second'] },
        { name: 'Shapes',       words: ['circle', 'square', 'triangle', 'rectangle'] },
        { name: 'Senses',       words: ['sight', 'hearing', 'smell', 'taste', 'touch'] },
        { name: 'Kingdoms',     words: ['plant', 'animal', 'mineral'] }
      ]
    }
  };

  var TEXT = {
    he: {
      dir: 'rtl', lang: 'he', name: 'עברית',
      title: 'סוליטר מילים',
      lead: 'על כל קלף כתובה מילה. סוגרים קטגוריה אחרי קטגוריה עד שהלוח ריק.',
      levelLabel: 'רמה',
      langLabel: 'שפה',
      levels: { easy: 'קל', medium: 'בינוני', hard: 'קשה' },
      levelHint: {
        easy: 'קטגוריות גדולות ורחוקות זו מזו',
        medium: 'יותר קטגוריות, מילים פחות שכיחות',
        hard: 'קטגוריות קטנות וקרובות זו לזו'
      },
      bankSize: function (n) { return 'הסט מוגרל מתוך ' + n + ' קטגוריות'; },
      start: 'התחלת משחק',
      moves: 'מהלכים', time: 'זמן', errors: 'טעויות',
      undo: 'ביטול מהלך',
      sameDeal: 'אותו הסידור',
      sameWords: 'אותן המילים',
      newSet: 'סט חדש',
      toMenu: 'לתפריט',
      soundOn: 'צליל פועל', soundOff: 'צליל כבוי',
      catGhost: 'קלף קטגוריה',
      again: 'סיבוב נוסף', empty: 'ריקה',
      rulesTitle: 'חוקי המשחק',
      rules: [
        'על כל קלף כתובה מילה. קלף קטגוריה כהה, ולצד שמו מופיע מספר המילים שבקטגוריה.',
        'בלוח ערמות בגדלים שונים. בכל ערמה חשוף בתחילה רק הקלף העליון, וקלף שנחשף נשאר גלוי.',
        'החפיסה מחזיקה, הפוכים, את כל הקלפים שאינם בלוח ואינם באחת מארבע הקטגוריות הפתוחות. לחיצה עליה חושפת קלף אל ערמת הגלויים שלצדה, והוא מכסה את הקלף שנחשף לפניו.',
        'זמין לשימוש רק הקלף העליון בערמת הגלויים. מה שמתחתיו נפתח רק אחרי שהעליון יורד ממנה. אי אפשר להניח קלף בחפיסה או בגלויים.',
        'כשהחפיסה מתרוקנת, הלחיצה הבאה עליה מחזירה אליה את הגלויים ומתחילה סיבוב נוסף.',
        'למקום פנוי למעלה אפשר להעביר רק קלף קטגוריה.',
        'על קלף קטגוריה מניחים רק מילים מאותה קטגוריה.',
        'על מילה אפשר להניח מילה אחרת מאותה קטגוריה, בין למעלה ובין בלוח.',
        'רצף של קלפים גלויים בערמה הוא תמיד מקטגוריה אחת, ואפשר להעביר אותו בשלמותו: אוחזים בקלף התחתון שברצף וגוררים את כולו.',
        'ערמה בלוח שהתרוקנה פנויה לכל קלף או רצף.',
        'קטגוריה שהושלמה יורדת מהלוח, והמקום מתפנה לקטגוריה הבאה.',
        'גוררים קלף אל היעד, או מקישים על קלף ואחר כך על היעד. ניסיון להניח קלף במקום שאינו חוקי מרעיד את הלוח, משמיע צליל, ונספר כטעות.',
        'חשיפת קלף מהחפיסה נספרת אף היא כמהלך.',
        'המטרה היא לרוקן את הלוח כולו.'
      ],
      winTitle: 'הלוח ריק',
      winText: function (n) { return 'כל ' + n + ' הקטגוריות נסגרו.'; }
    },

    en: {
      dir: 'ltr', lang: 'en', name: 'English',
      title: 'Word Solitaire',
      lead: 'Every card carries a word. Close one category after another until the board is empty.',
      levelLabel: 'Level',
      langLabel: 'Language',
      levels: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
      levelHint: {
        easy: 'large categories, far apart',
        medium: 'more categories, less common words',
        hard: 'small categories, close to one another'
      },
      bankSize: function (n) { return 'drawn from ' + n + ' categories'; },
      start: 'Start a game',
      moves: 'Moves', time: 'Time', errors: 'Mistakes',
      undo: 'Undo',
      sameDeal: 'Same deal',
      sameWords: 'Same words',
      newSet: 'New set',
      toMenu: 'Menu',
      soundOn: 'Sound on', soundOff: 'Sound off',
      catGhost: 'category card',
      again: 'another pass', empty: 'empty',
      rulesTitle: 'How to play',
      rules: [
        'Every card carries a word. A category card is dark, and the number beside its name is how many words the category holds.',
        'The tableau holds piles of differing sizes. Only the top card of each starts face up, and a card that has been exposed stays face up.',
        'The stock holds, face down, every card that is neither in the tableau nor in one of the four open categories. Clicking it turns one card face up onto the waste beside it, covering whatever was there.',
        'Only the top card of the waste can be played. What lies under it becomes available once the top one leaves. Neither the stock nor the waste accepts a card.',
        'When the stock runs out, the next click turns the waste back over and starts another pass.',
        'An empty slot above takes a category card and nothing else.',
        'A category card takes only words of its own category.',
        'A word may be placed on another word of the same category, above or in the tableau.',
        'A run of face-up cards in a pile always belongs to one category, and it moves as a unit: take hold of the lowest card in the run and drag the whole of it.',
        'A tableau pile that has emptied takes any card or run.',
        'A category that is complete leaves the board, and its slot opens for the next one.',
        'Drag a card to its destination, or tap the card and then the destination. Placing a card where the rules forbid shakes the board, sounds a buzz, and counts as a mistake.',
        'Turning a card from the stock counts as a move too.',
        'The goal is to empty the whole board.'
      ],
      winTitle: 'The board is clear',
      winText: function (n) { return 'All ' + n + ' categories are closed.'; }
    }
  };

  root.WordSolContent = { BANKS: BANKS, TEXT: TEXT };
})(typeof window !== 'undefined' ? window : globalThis);
