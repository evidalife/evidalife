-- Migration: 20260318000008_fix_all_daily_dozen_data
-- Complete replacement of ALL details for ALL 12 Daily Dozen categories
-- with exact data from the Dr. Greger Daily Dozen app

WITH category_details (slug, details) AS (
  VALUES

    ('beans', '{
      "servings": {
        "de": ["70g Hummus oder Bohnendip","100g gekochte Bohnen/Schälerbsen/Linsen","80g Tofu oder Tempeh","100g frische Erbsen oder gekeimte Linsen"],
        "en": ["70g hummus or bean dip","100g cooked beans/split peas/lentils","80g tofu or tempeh","100g fresh peas or sprouted lentils"]
      },
      "types": {
        "de": ["Schwarze Bohnen","Augenbohnen","Butterbohnen","Cannellini-Bohnen","Kichererbsen","Edamame","Erbsen","Weisse Bohnen","Kidneybohnen","Linsen (Beluga/Französische/Rote)","Marinebohnen","Pintobohnen","Kleine rote Bohnen","Schälerbsen (gelb/grün)","Tempeh"],
        "en": ["Black beans","Black-eyed peas","Butter beans","Cannellini beans","Chickpeas/Garbanzo beans","Edamame","English peas","Great northern beans","Kidney beans","Lentils (beluga/french/red)","Navy beans","Pinto beans","Small red beans","Split peas (yellow or green)","Tempeh"]
      }
    }'::jsonb),

    ('berries', '{
      "servings": {
        "de": ["60g frisch oder tiefgefroren","40g getrocknet"],
        "en": ["60g fresh or frozen","40g dried"]
      },
      "types": {
        "de": ["Acai-Beeren","Berberitzen","Brombeeren","Blaubeeren","Kirschen","Concord-Trauben","Cranberries","Goji-Beeren","Kumquats","Maulbeeren","Himbeeren (schwarz/rot)","Erdbeeren"],
        "en": ["Acai berries","Barberries","Blackberries","Blueberries","Cherries","Concord grapes","Cranberries","Goji berries","Kumquats","Mulberries","Raspberries (black or red)","Strawberries"]
      }
    }'::jsonb),

    ('other-fruits', '{
      "servings": {
        "de": ["1 mittelgrosse Frucht","150g geschnittenes Obst","40g Trockenfrüchte"],
        "en": ["1 medium-sized fruit","150g cut-up fruit","40g dried fruit"]
      },
      "types": {
        "de": ["Äpfel","Aprikosen","Avocados","Bananen","Cantaloupe-Melone","Clementinen","Datteln","Feigen","Grapefruit","Honigmelone","Kiwi","Zitronen","Limetten","Lychees","Mangos","Nektarinen","Orangen","Papaya","Passionsfrucht","Pfirsiche","Birnen","Ananas","Pflaumen (bes. schwarze)","Pluots","Granatäpfel","Backpflaumen","Mandarinen","Wassermelone"],
        "en": ["Apples","Apricots","Avocados","Bananas","Cantaloupe","Clementines","Dates","Figs","Grapefruit","Honeydew","Kiwifruit","Lemons","Limes","Lychees","Mangos","Nectarines","Oranges","Papaya","Passion fruit","Peaches","Pears","Pineapple","Plums (especially black plums)","Pluots","Pomegranates","Prunes","Tangerines","Watermelon"]
      }
    }'::jsonb),

    ('cruciferous', '{
      "servings": {
        "de": ["90g gekochtes Blattgemüse","90g rohes oder gekochtes Nicht-Blattgemüse","60g rohes Blattgemüse","20g Brokkolisprossen","1 Esslöffel Meerrettich"],
        "en": ["90g cooked leafy vegetables","90g raw or cooked non-leafy vegetables","60g raw leafy vegetables","20g broccoli sprouts","1 tablespoon horseradish"]
      },
      "types": {
        "de": ["Rucola","Pak Choi","Brokkoli (inkl. Romanesco)","Rosenkohl","Kohl (Weiß/Rot/Wirsing)","Blumenkohl","Collard-Blätter","Meerrettich","Grünkohl","Kohlrabi","Senfgrün","Radieschen","Steckrübengrün","Brunnenkresse"],
        "en": ["Arugula","Bok choy","Broccoli (incl. Romanesco)","Brussels sprouts","Cabbage (green/red/savoy)","Cauliflower","Collard greens","Horseradish","Kale","Kohlrabi","Mustard greens","Radish","Turnip greens","Watercress"]
      }
    }'::jsonb),

    ('greens', '{
      "servings": {
        "de": ["60g roh","90g gekocht"],
        "en": ["60g raw","90g cooked"]
      },
      "types": {
        "de": ["Rucola","Rote-Bete-Blätter","Collard-Blätter","Grünkohl","Mesclun-Mix","Senfgrün","Sauerampfer","Spinat","Mangold","Stielmus"],
        "en": ["Arugula","Beet greens","Collard greens","Kale","Mesclun mix","Mustard greens","Sorrel","Spinach","Swiss chard","Turnip greens"]
      }
    }'::jsonb),

    ('other-veg', '{
      "servings": {
        "de": ["60g rohes Blattgemüse","90g rohes oder gekochtes Nicht-Blattgemüse","120ml Gemüsesaft","10g getrocknete Pilze"],
        "en": ["60g raw leafy vegetables","90g raw or cooked non-leafy vegetables","120ml vegetable juice","10g dried mushrooms"]
      },
      "types": {
        "de": ["Artischocken","Spargel","Rote Bete","Paprika","Karotten","Mais","Knoblauch","Pilze (Champignon/Austern/Steinpilz/Portobello/Shiitake)","Okra","Zwiebeln","Lila Kartoffeln","Kürbis","Meeresgemüse (Arame/Dulse/Nori)","Zuckerschoten","Kürbis (Delicata/Sommer/Spaghetti)","Süsskartoffeln/Yams","Tomaten","Zucchini"],
        "en": ["Artichokes","Asparagus","Beets","Bell peppers","Carrots","Corn","Garlic","Mushrooms (button/oyster/porcini/portobello/shiitake)","Okra","Onions","Purple potatoes","Pumpkin","Sea vegetables (arame/dulse/nori)","Snap peas","Squash (delicata/summer/spaghetti)","Sweet potatoes/yams","Tomatoes","Zucchini"]
      }
    }'::jsonb),

    ('flaxseeds', '{
      "servings": {
        "de": ["1 Esslöffel gemahlen"],
        "en": ["1 tablespoon ground"]
      },
      "types": {
        "de": ["Braune Leinsamen","Goldene Leinsamen"],
        "en": ["Brown flaxseeds","Golden flaxseeds"]
      }
    }'::jsonb),

    ('nuts-seeds', '{
      "servings": {
        "de": ["30g Nüsse oder Samen","2 Esslöffel Nuss- oder Samenbutter"],
        "en": ["30g nuts or seeds","2 tablespoons nut or seed butter"]
      },
      "types": {
        "de": ["Mandeln","Cashews","Chiasamen","Haselnüsse","Hanfsamen","Macadamianüsse","Erdnüsse","Pekannüsse","Pistazien","Kürbiskerne","Sesamsamen","Sonnenblumenkerne","Walnüsse"],
        "en": ["Almonds","Cashews","Chia seeds","Hazelnuts","Hemp seeds","Macadamia nuts","Peanuts","Pecans","Pistachios","Pumpkin seeds","Sesame seeds","Sunflower seeds","Walnuts"]
      }
    }'::jsonb),

    ('herbs-spices', '{
      "servings": {
        "de": ["¼ Teelöffel Kurkuma","Beliebige andere salzfreie Kräuter und Gewürze"],
        "en": ["¼ teaspoon of turmeric","Any other salt-free herbs and spices you enjoy"]
      },
      "types": {
        "de": ["Piment","Berberitzen","Basilikum","Lorbeerblätter","Kardamom","Chilipulver","Koriander (frisch)","Zimt","Nelken","Koriander","Kreuzkümmel","Currypulver","Dill","Bockshornklee","Knoblauch","Ingwer","Meerrettich","Zitronengras","Majoran","Senfpulver","Muskatnuss","Oregano","Geräuchertes Paprikapulver","Petersilie","Pfeffer","Pfefferminze","Rosmarin","Safran","Salbei","Thymian","Kurkuma","Vanille"],
        "en": ["Allspice","Barberries","Basil","Bay leaves","Cardamom","Chili powder","Cilantro","Cinnamon","Cloves","Coriander","Cumin","Curry powder","Dill","Fenugreek","Garlic","Ginger","Horseradish","Lemongrass","Marjoram","Mustard powder","Nutmeg","Oregano","Smoked paprika","Parsley","Pepper","Peppermint","Rosemary","Saffron","Sage","Thyme","Turmeric","Vanilla"]
      }
    }'::jsonb),

    ('whole-grains', '{
      "servings": {
        "de": ["100g gekochtes Vollkorn/Vollkornpasta/Maiskörner","50g 100% Vollkorn-Müsli (kalt)","1 Vollkorn-Tortilla (oder 2 Mais-Tortillas)","1 Scheibe Vollkornbrot","½ Bagel oder English Muffin","30g gepopptes Popcorn"],
        "en": ["100g cooked whole grains/whole-wheat pasta/corn kernels","50g 100% whole grain cold cereal","1 100% whole grain tortilla (or 2 corn tortillas)","1 slice 100% whole grain bread","½ bagel or English muffin","30g popped popcorn"]
      },
      "types": {
        "de": ["Gerste","Buchweizen","Hirse","Hafer","Popcorn","Quinoa","Roggen","Teff","Vollkornpasta"],
        "en": ["Barley","Buckwheat","Millet","Oats","Popcorn","Quinoa","Rye","Teff","Whole-wheat pasta"]
      }
    }'::jsonb),

    ('beverages', '{
      "servings": {
        "de": ["Ein Glas (350ml)"],
        "en": ["One glass (350ml)"]
      },
      "types": {
        "de": ["Schwarztee","Chai-Tee","Vanille-Kamillentee","Kaffee","Earl-Grey-Tee","Grüner Tee","Hibiskustee","Jasmin-Tee","Zitronenmelisse-Tee","Matcha-Tee","Mandelblüten-Oolong-Tee","Pfefferminztee","Rooibos-Tee","Wasser","Weisser Tee"],
        "en": ["Black tea","Chai tea","Vanilla chamomile tea","Coffee","Earl grey tea","Green tea","Hibiscus tea","Jasmine tea","Lemon balm tea","Matcha tea","Almond blossom oolong tea","Peppermint tea","Rooibos tea","Water","White tea"]
      }
    }'::jsonb),

    ('exercise', '{
      "servings": {
        "de": ["90 Minuten moderate Aktivität","40 Minuten intensive Aktivität"],
        "en": ["90 minutes moderate-intensity activity","40 minutes vigorous-intensity activity"]
      },
      "types": {
        "de": ["Radfahren","Kanufahren","Tanzen","Völkerball","Skifahren (Abfahrt)","Fechten","Wandern","Hausarbeit","Eislaufen","Inlineskaten","Jonglieren","Trampolinspringen","Tretbootfahren","Frisbee spielen","Rollschuhlaufen","Basketball werfen","Leichtes Schneeschaufeln","Skateboarden","Schnorcheln","Surfen","Freizeitschwimmen","Tennis (Doppel)","Wassertreten","Zügiges Gehen (6,4 km/h)","Wassergymnastik","Wasserski","Gartenarbeit","Yoga","Rucksackwandern","Basketball","Bergauf Radfahren","Zirkeltraining","Langlauf","Football","Hockey","Joggen","Hampelmänner","Seilspringen","Lacrosse","Liegestütze","Klimmzüge","Racquetball","Klettern","Rugby","Laufen","Gerätetauchen","Tennis (Einzel)","Fussball","Eisschnelllauf","Squash","Step-Aerobic","Schwimmen (Bahnen)","Zügiges Bergaufgehen","Wasserjogging"],
        "en": ["Bicycling","Canoeing","Dancing","Dodgeball","Downhill skiing","Fencing","Hiking","Housework","Ice-skating","Inline skating","Juggling","Jumping on a trampoline","Paddle boating","Playing frisbee","Roller-skating","Shooting baskets","Shoveling light snow","Skateboarding","Snorkeling","Surfing","Swimming recreationally","Tennis (doubles)","Treading water","Walking briskly (6.4 km/h)","Water aerobics","Waterskiing","Yard work","Yoga","Backpacking","Basketball","Bicycling uphill","Circuit weight training","Cross-country skiing","Football","Hockey","Jogging","Jumping jacks","Jumping rope","Lacrosse","Push-ups","Pull-ups","Racquetball","Rock climbing","Rugby","Running","Scuba diving","Tennis (singles)","Soccer","Speed skating","Squash","Step aerobics","Swimming laps","Walking briskly uphill","Water jogging"]
      }
    }'::jsonb)

)
UPDATE daily_dozen_categories c
SET details = cd.details
FROM category_details cd
WHERE c.slug = cd.slug;
