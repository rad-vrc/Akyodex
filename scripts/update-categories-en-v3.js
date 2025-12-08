
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const DATA_DIR = path.join(process.cwd(), 'data');
const CSV_PATH = path.join(DATA_DIR, 'akyo-data-en.csv');

// --- Definitions (English Mappings) ---

const MAJOR_ANIMALS = [
  'Cat', 'Dog', 'Fox', 'Rabbit', 'Tanuki', 'Wolf', 'Bear', 'Bird', 
  'Snake', 'Turtle', 'Elephant', 'Giraffe', 'Deer', 'Mouse', 'Squirrel', 'Penguin', 
  'Lion', 'Tiger', 'Horse', 'Cow', 'Pig', 'Monkey', 'Hamster', 'Alpaca',
  'Gecko', 'Frog', 'Shark', 'Whale', 'Dolphin', 'Orca', 'Crab', 'Squid', 'Octopus',
  'Jellyfish', 'Goldfish', 'Carp', 'Bug', 'Dinosaur', 'Reindeer', 'Stoat', 'Hedgehog',
  'Chick', 'Sheep', 'Husky', 'Seal', 'Kangaroo', 'Sparrow', 'Swan', 'Snail', 'Rail',
  'Boar', 'Ermine', 'Panda', 'Red Panda'
];

const MARINE_LIFE = [
  'Fish', 'Shark', 'Whale', 'Dolphin', 'Orca', 'Ray', 'Sunfish', 'Goldfish', 'Carp', 
  'Tropical Fish', 'Deep Sea Fish', 'Crab', 'Squid', 'Octopus', 'Jellyfish', 'Sea Slug', 
  'Clione', 'Seal', 'Fur Seal', 'Dugong', 'Manatee', 'Penguin', 'Turtle', 'Sacabambaspis',
  'Amago', 'Bonito'
];

const FOOD_KEYWORDS = {
  'Vegetable': ['Vegetable', 'Radish', 'Carrot', 'Cabbage', 'Eggplant', 'Tomato', 'Cucumber', 'Onion', 'Corn', 'Chili', 'Potato', 'Sweet Potato', 'Pumpkin', 'Broccoli', 'Asparagus', 'Bean', 'Edamame', 'Pepper', 'Lettuce', 'Spinach', 'Burdock', 'Lotus Root', 'Bamboo Shoot', 'Mushroom', 'Shiitake', 'Enoki', 'Maitake', 'Eringi', 'Truffle', 'Matsutake', 'Wasabi', 'Ginger', 'Garlic'],
  'Fruit': ['Fruit', 'Mandarin', 'Apple', 'Banana', 'Melon', 'Watermelon', 'Peach', 'Grape', 'Lemon', 'Strawberry', 'Cherry', 'Pear', 'Persimmon', 'Chestnut', 'Pineapple', 'Mango', 'Kiwi', 'Yuzu', 'Lime', 'Orange', 'Grapefruit', 'Mikan'],
  'Sweets': ['Sweets', 'Snack', 'Cake', 'Pudding', 'Ice Cream', 'Chocolate', 'Cookie', 'Donut', 'Macaron', 'Parfait', 'Crepe', 'Wagashi', 'Dango', 'Daifuku', 'Manju', 'Yokan', 'Castella', 'Taiyaki', 'Dorayaki', 'Senbei', 'Candy', 'Gum', 'Gummy', 'Ramune', 'Marshmallow', 'Jelly', 'Pancake', 'Waffle', 'Tart', 'Cream Puff', 'Eclair', 'Mont Blanc', 'Tiramisu', 'Cheesecake', 'Shortcake', 'Apple Pie', 'Melon Pan', 'Anpan', 'Cream Pan', 'Jam Pan', 'Cornet', 'Shaved Ice', 'Oshiruko', 'Zenzai', 'Mochi', 'Shiratama', 'Warabimochi', 'Popcorn', 'Potato Chips', 'Suama', 'Yokan', 'Dango', 'Cornet', 'Pon de'],
  'Dish': ['Dish', 'Rice', 'Bread', 'Noodle', 'Bowl', 'Sushi', 'Curry', 'Ramen', 'Udon', 'Soba', 'Pasta', 'Pizza', 'Burger', 'Hot Dog', 'Sandwich', 'Onigiri', 'Bento', 'Lunch', 'Dinner', 'Steak', 'Hamburg', 'Yakiniku', 'Yakitori', 'Karaage', 'Tempura', 'Fry', 'Cutlet', 'Croquette', 'Gratin', 'Stew', 'Soup', 'Miso Soup', 'Pot', 'Oden', 'Sukiyaki', 'Shabu-shabu', 'Omelette Rice', 'Fried Rice', 'Pilaf', 'Risotto', 'Doria', 'Lasagna', 'Gyoza', 'Shumai', 'Spring Roll', 'Meat Bun', 'Takoyaki', 'Okonomiyaki', 'Yakisoba', 'Tenmusu', 'Unaju', 'Red Rice', 'Tororo', 'Kids Lunch', 'Toast', 'Grilled', 'Bonjiri', 'Sushi', 'Chikuwa', 'Burger', 'Baked Potato', 'Inari', 'Fried', 'Fries', 'Natto', 'Omurice', 'Unagi', 'Meal', 'Potato', 'Tail Meat'],
  'Seasoning': ['Seasoning', 'Soy Sauce', 'Miso', 'Salt', 'Sugar', 'Pepper', 'Vinegar', 'Oil', 'Sauce', 'Mayonnaise', 'Ketchup', 'Dressing', 'Spice', 'Herb', 'Butter', 'Jam', 'Honey', 'Mayo', 'Wasabi'],
  'Drink': ['Drink', 'Juice', 'Tea', 'Coffee', 'Alcohol', 'Beer', 'Wine', 'Sake', 'Water', 'Milk', 'Green Tea', 'Tapioca', 'Melon Soda']
};

const FICTIONAL_KEYWORDS = {
  'Dragon': ['Dragon', 'Wyvern', 'Drake'],
  'Yokai・Ghost': ['Yokai', 'Ghost', 'Spirit', 'Tengu', 'Kappa', 'Oni', 'Zashiki Warashi', 'Yuki Onna', 'Rokurokubi', 'Cyclops', 'Karakasa', 'Lantern', 'Nurikabe', 'Ittan Momen', 'Bakeneko', 'Nekomata', 'Nine-Tailed Fox', 'Jiangshi', 'Zombie', 'Mummy', 'Vampire', 'Dracula', 'Werewolf', 'Frankenstein', 'Franken', 'Witch', 'Wizard', 'Reaper', 'Demon', 'Angel', 'Fallen Angel', 'Succubus', 'Incubus', 'Fairy', 'Elf', 'Dwarf', 'Orc', 'Goblin', 'Slime', 'Mimic', 'Golem', 'Gargoyle', 'Cerberus', 'Pegasus', 'Unicorn', 'Phoenix', 'Griffin', 'Chimera', 'Hydra', 'Kraken', 'Leviathan', 'Bahamut', 'Tiamat', 'Shiva', 'Ifrit', 'Ramuh', 'Odin', 'Zeus', 'Poseidon', 'Hades', 'Anubis', 'Bastet', 'Horus', 'Ra', 'Medjed', 'Sphinx', 'Among', 'Olaf'],
  'Mythical Beast・Spirit': ['Mythical Beast', 'Spirit', 'Fairy', 'Pegasus', 'Unicorn', 'Phoenix', 'Griffin', 'Chimera', 'Cerberus', 'Akyoberos', 'Salamander', 'Undine', 'Sylph', 'Gnome']
};

const MATERIAL_KEYWORDS = {
  'Stone': ['Stone', 'Rock', 'Ore', 'Gem', 'Crystal', 'Diamond', 'Ruby', 'Sapphire', 'Emerald', 'Amethyst', 'Jade', 'Agate', 'Quartz', 'Glass', 'Stained Glass'],
  'Metal': ['Metal', 'Iron', 'Copper', 'Silver', 'Gold', 'Platinum', 'Aluminum', 'Stainless', 'Brass', 'Bronze', 'Rust'],
  'Other': ['Voxel', 'Wood', 'Paper', 'Cloth', 'Leather', 'Plastic', 'Rubber', 'Clay', 'Ceramic', 'Porcelain', 'Fluffy', 'Messy', 'Shaggy']
};

const APPLIANCE_KEYWORDS = ['Appliance', 'Furniture', 'Bulb', 'Fridge', 'Washing Machine', 'TV', 'PC', 'Phone', 'Clock', 'Camera', 'Fan', 'Air Conditioner', 'Stove', 'Heater', 'Kotatsu', 'Chair', 'Desk', 'Table', 'Sofa', 'Bed', 'Cabinet', 'Shelf', 'Bookshelf', 'Door', 'Window', 'Curtain', 'Carpet', 'Rug', 'Mat', 'Cushion', 'Pillow', 'Futon', 'Blanket', 'Towel', 'Handkerchief', 'Tissue', 'Toilet Paper', 'Trash Can', 'Vacuum', 'Iron', 'Dryer', 'Sewing Machine', 'Scissors', 'Cutter', 'Ruler', 'Pencil', 'Pen', 'Notebook', 'Diary', 'Calendar', 'Poster', 'Painting', 'Photo', 'Mirror', 'Umbrella', 'Cane', 'Bag', 'Wallet', 'Key', 'Daruma', 'Akabeko', 'Glasses'];

const PLANT_KEYWORDS = ['Plant', 'Flower', 'Grass', 'Tree', 'Leaf', 'Seed', 'Sprout', 'Root', 'Stem', 'Fruit', 'Cherry Blossom', 'Plum', 'Peach', 'Pine', 'Bamboo', 'Morning Glory', 'Sunflower', 'Tulip', 'Rose', 'Lily', 'Hydrangea', 'Cosmos', 'Dandelion', 'Clover', 'Cactus', 'Succulent', 'Bonsai', 'Vegetable', 'Fruit', 'Palm', 'Sakura'];

const OCCUPATION_KEYWORDS = ['Occupation', 'Costume', 'Uniform', 'Suit', 'Dress', 'Kimono', 'Yukata', 'Hakama', 'Happi', 'Swimsuit', 'Pajama', 'Nurse', 'Doctor', 'Police', 'Firefighter', 'Station Staff', 'Pilot', 'Cabin Attendant', 'Maid', 'Butler', 'Waitress', 'Chef', 'Cook', 'Patissier', 'Idol', 'Singer', 'Dancer', 'Model', 'Actor', 'Voice Actor', 'Painter', 'Writer', 'Mangaka', 'Engineer', 'Programmer', 'Student', 'Teacher', 'Professor', 'Detective', 'Ninja', 'Samurai', 'Warrior', 'Knight', 'Wizard', 'Monk', 'Priest', 'Shrine Maiden', 'Sister', 'Santa', 'Pirate', 'Astronaut', 'Athlete', 'Baseball', 'Soccer', 'Tennis', 'Basketball', 'Volleyball', 'Swimming', 'Track', 'Judo', 'Kendo', 'Archery', 'Sumo', 'Boxing', 'Wrestling', 'Post', 'Indian', 'Bunny', 'Soldier', 'Diver', 'Lord', 'Uncle', 'Farmer', 'Infantry', 'Hunter', 'Groom', 'Submarine', 'Cleaning', 'Kid', 'Stretch', 'Gucci', 'Jong', 'Poncho', 'Aloha', 'Muffler', 'Fishing'];

const SEASON_KEYWORDS = ['Season', 'Event', 'Spring', 'Summer', 'Autumn', 'Winter', 'New Year', 'Setsubun', 'Hinamatsuri', 'Hanami', 'Children\'s Day', 'Tanabata', 'Obon', 'Halloween', 'Christmas', 'New Year\'s Eve', 'Valentine', 'White Day', 'Graduation', 'Entrance', 'Summer Vacation', 'Winter Vacation', 'Spring Vacation', 'Golden Week', 'Silver Week', 'Festival', 'Fireworks', 'Beach', 'Autumn Leaves', 'Snow', 'Carp Streamer', 'Lion Dance', 'Harvest', 'Koinobori', 'Teru Teru', 'Tropical', 'Fall'];

const ELECTRONIC_KEYWORDS = ['Electronic', 'Cyber', 'Digital', 'Techno', 'Robot', 'Android', 'Mech', 'Machine', 'AI', 'VR', 'AR', 'MR', 'Metaverse', 'Internet', 'Web', 'Program', 'Code', 'Bug', 'Glitch', 'Pixel', 'Dot', 'Battery', 'Loader', 'Nu', 'J2m3', 'Virtual'];

const MUSIC_KEYWORDS = ['Music', 'Instrument', 'Song', 'Piano', 'Guitar', 'Bass', 'Drum', 'Violin', 'Flute', 'Trumpet', 'Saxophone', 'Mic', 'Speaker', 'Headphone', 'Earphone', 'Record', 'CD', 'Cassette', 'Radio', 'DJ', 'Band', 'Orchestra', 'Live', 'Concert', 'Note', 'Melody', 'Rhythm', 'Harmony', 'Theremin'];

const TOOL_KEYWORDS = ['Tool', 'Stationery', 'Kitchenware', 'Cleaning Tool', 'Eraser', 'Blackboard Eraser', 'Shampoo', 'Brush', 'Pencil', 'Letter Pack'];

const BATH_KEYWORDS = ['Bath', 'Hot Spring', 'Sauna', 'Sento', 'Shampoo', 'Soap', 'Body Soap', 'Towel', 'Bucket', 'Duck', 'Sau'];

const SCHOOL_KEYWORDS = ['School', 'Classroom', 'Blackboard', 'Blackboard Eraser', 'Desk', 'Chair', 'School Bag', 'Textbook', 'Notebook', 'Pencil', 'Eraser', 'Uniform', 'Lunch', 'Test', 'Homework'];

const NATURE_KEYWORDS = ['Nature', 'Mountain', 'River', 'Sea', 'Sky', 'Cloud', 'Rain', 'Snow', 'Wind', 'Thunder', 'Rainbow', 'Sun', 'Moon', 'Star', 'Space', 'Earth', 'Forest', 'Woods', 'Grassland', 'Desert', 'Glacier', 'Volcano', 'Mt. Fuji', 'Mount Fuji', 'Hinata', 'Ezo'];

const HISTORY_KEYWORDS = ['History', 'Ancient', 'Medieval', 'Modern', 'Future', 'Ruins', 'Kofun', 'Haniwa', 'Dogu', 'Castle', 'Temple', 'Shrine', 'Buddha', 'Sword', 'Armor', 'Helmet', 'Kimono', 'Samurai', 'Ninja', 'Warrior', 'Shogun', 'Lord', 'Princess', 'King', 'Queen', 'Emperor', 'Noble', 'Peasant', 'Townsman', 'Daruma', 'Akabeko', 'Pharaoh', 'Egyptian', 'Jizo', 'USSR', 'Venice'];

const BODY_KEYWORDS = ['Body Type', 'Fat', 'Macho', 'Muscle', 'Skinny', 'Tall', 'Short', 'Big Boobs', 'Flat Chest', 'Chubby', 'Half'];

const ART_KEYWORDS = ['Art', 'Painting', 'Sculpture', 'Photo', 'Design', 'Illustration', 'Manga', 'Anime', 'Movie', 'Theater', 'Dance', 'Music', 'Literature', 'Poem', 'Novel', 'Real'];


function processCategories(categoryStr, nickname) {
  if (!categoryStr) categoryStr = '';
  let categories = categoryStr.replace(/、/g, ',').split(',').map(c => c.trim()).filter(c => c);

  // --- 1. Pre-processing & Merging ---
  
  categories = categories.map(c => (c === 'Gimmick' || c === 'Special') ? 'Gimmick・Special' : c);
  categories = categories.map(c => (c === 'Material') ? 'Material・Texture' : c);
  categories = categories.map(c => (c === 'Fictional' || c === 'Yokai' || c === 'Dragon') ? 'Fictional Being' : c);
  categories = categories.map(c => (c === 'Art' || c === 'Arts') ? 'Art' : c);
  categories = categories.map(c => (c === 'Music' || c === 'Instrument') ? 'Music・Instrument' : c);

  if (categories.includes('Fish')) {
      categories = categories.filter(c => c !== 'Fish');
      categories.push('Animal');
      categories.push('Animal/Marine Life');
  }

  // --- 2. Keyword-based Categorization ---
  
  const addCat = (cat) => { if (!categories.includes(cat)) categories.push(cat); };

  // Food Logic
  for (const [subCat, keywords] of Object.entries(FOOD_KEYWORDS)) {
      if (keywords.some(k => nickname.includes(k) || categories.includes(k))) {
          if (subCat === 'Seasoning') {
              addCat('Seasoning');
              categories = categories.filter(c => c !== 'Mayo');
          } else if (subCat === 'Drink') {
              addCat('Drink');
          } else {
              addCat('Food');
              addCat(`Food/${subCat}`);
          }
      }
  }
  if (nickname.includes('Tofu') || nickname.includes('Gyoza')) {
      addCat('Food');
      addCat('Food/Dish');
  }
  categories = categories.map(c => {
      if (['Vegetable', 'Sweets', 'Fruit', 'Dish'].includes(c)) return `Food/${c}`;
      return c;
  });
  if (categories.some(c => c.startsWith('Food/'))) addCat('Food');

  // Mint Chocolate Exception
  if (categories.includes('Mint Chocolate')) {
      categories = categories.filter(c => !c.startsWith('Food'));
  }

  // Animal Logic
  if (MARINE_LIFE.some(k => nickname.includes(k) || categories.includes(k))) {
      addCat('Animal');
      addCat('Animal/Marine Life');
  }

  MAJOR_ANIMALS.forEach(animal => {
      if (nickname.includes(animal) || categories.includes(animal)) {
          addCat('Animal');
          addCat(`Animal/${animal}`);
      }
  });
  
  if (nickname.includes('Animal') || categories.includes('Animal')) {
      addCat('Animal');
  }
  
  // Fictional Logic
  if (nickname.includes('Karasu Tengu')) {
      addCat('Fictional Being');
      addCat('Fictional Being/Yokai・Ghost');
  }
  if (nickname.includes('Akyoberos')) {
      addCat('Fictional Being');
      addCat('Fictional Being/Mythical Beast・Spirit');
  }

  for (const [subCat, keywords] of Object.entries(FICTIONAL_KEYWORDS)) {
      if (keywords.some(k => nickname.includes(k) || categories.includes(k))) {
          addCat('Fictional Being');
          addCat(`Fictional Being/${subCat}`);
      }
  }

  // Material Logic
  if (nickname.includes('Voxel') || nickname.includes('Amethyst')) {
      addCat('Material・Texture');
  }
  if (categories.includes('Stone') || nickname.includes('Stone')) {
      if (categories.includes('Stone')) {
           categories = categories.filter(c => c !== 'Stone');
           addCat('Material・Texture');
           addCat('Material・Texture/Stone');
      }
  }
  for (const [subCat, keywords] of Object.entries(MATERIAL_KEYWORDS)) {
       if (keywords.some(k => nickname.includes(k) || categories.includes(k))) {
           addCat('Material・Texture');
           if (subCat !== 'Other') addCat(`Material・Texture/${subCat}`);
       }
  }

  // Special/Effects
  if (['Bubble', 'Sparkle', 'Sparkly', 'Particle', 'About to Fall', 'Wave', 'Hypnosis', 'Sucked-In', 'Disappearing', 'Melted', 'Chromatophore', 'Menses', 'Hinyo'].some(k => nickname.includes(k))) {
      addCat('Gimmick・Special');
  }
  if (nickname.includes('Rainbow')) {
      addCat('Color');
  }

  // Appliances/Furniture
  if (APPLIANCE_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('Appliances・Furniture');
  }

  // Plant
  if (PLANT_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('Plant');
  }

  // Occupation/Costume
  if (OCCUPATION_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('Costume・Occupation');
  }

  // Season/Event
  if (SEASON_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('Season・Event');
  }

  // Electronic
  if (ELECTRONIC_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('Electronic');
  }

  // Music
  if (MUSIC_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('Music・Instrument');
  }

  // Tool
  if (TOOL_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('Tool');
  }

  // Bath
  if (BATH_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('Bath');
  }

  // School
  if (SCHOOL_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('School');
  }

  // Nature
  if (NATURE_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('Nature');
  }

  // History
  if (HISTORY_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('History');
  }

  // Body Type
  if (BODY_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('Body Type');
  }

  // Art
  if (ART_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('Art');
  }
  if (nickname.includes('Real')) {
      addCat('Real Photo');
  }

  // --- 3. Cleanup & Deduplication ---
  
  if (categories.length > 1 && categories.includes('Uncategorized')) {
      categories = categories.filter(c => c !== 'Uncategorized');
  }
  
  categories = categories.filter(c => c);

  const result = [...new Set(categories)].join(',');
  return result || 'Uncategorized';
}

async function main() {
  console.log('Reading CSV...');
  const input = fs.readFileSync(CSV_PATH, 'utf8');
  
  const records = parse(input, {
    columns: false,
    relax_quotes: true,
    relax_column_count: true,
    skip_empty_lines: true,
  });

  const header = records[0];
  const categoryIdx = header.findIndex(h => h.trim() === 'Category');
  const nicknameIdx = header.findIndex(h => h.trim() === 'Nickname');

  if (categoryIdx === -1 || nicknameIdx === -1) {
    console.error('Could not find Category or Nickname column');
    process.exit(1);
  }

  console.log('Processing records...');
  const newRecords = [header];
  let modifiedCount = 0;

  for (let i = 1; i < records.length; i++) {
    const record = records[i];
    const oldCategory = record[categoryIdx];
    const nickname = record[nicknameIdx];
    
    const newCategory = processCategories(oldCategory, nickname);
    
    if (oldCategory !== newCategory) {
      record[categoryIdx] = newCategory;
      modifiedCount++;
    }
    newRecords.push(record);
  }

  console.log(`Modified ${modifiedCount} records.`);

  console.log('Writing CSV...');
  const output = stringify(newRecords, {
    quoted: true,
  });
  
  fs.writeFileSync(CSV_PATH, output);
  console.log('Done.');
}

main();
