-- Migration: 20260318000006_daily_dozen_details
-- Add bilingual details (serving sizes + qualifying foods) to daily_dozen_categories

ALTER TABLE daily_dozen_categories ADD COLUMN IF NOT EXISTS details jsonb;

WITH category_details (slug, details) AS (
  VALUES
    ('beans', '{
      "servings": {
        "de": ["70g Hummus oder Bohnendip","100g gekochte Bohnen, Schälerbsen oder Linsen","80g Tofu oder Tempeh","100g frische Erbsen oder gekeimte Linsen"],
        "en": ["70g hummus or bean dip","100g cooked beans, split peas, or lentils","80g tofu or tempeh","100g fresh peas or sprouted lentils"]
      },
      "types": {
        "de": ["Schwarze Bohnen","Butterbohnen","Kichererbsen","Edamame","Kidneybohnen","Linsen (Beluga/Französisch/Rot)","Marinebohnen","Pintobohnen","Kleine rote Bohnen","Schälerbsen","Tempeh"],
        "en": ["Black beans","Butter beans","Chickpeas","Edamame","Kidney beans","Lentils (beluga/french/red)","Navy beans","Pinto beans","Small red beans","Split peas","Tempeh"]
      }
    }'::jsonb),

    ('berries', '{
      "servings": {
        "de": ["60g frisch oder tiefgekühlt","40g getrocknet"],
        "en": ["60g fresh or frozen","40g dried"]
      },
      "types": {
        "de": ["Açaí-Beeren","Berberitzen","Brombeeren","Blaubeeren","Kirschen","Cranberries","Goji-Beeren","Trauben (rot/lila)","Kumquats","Maulbeeren","Himbeeren","Erdbeeren"],
        "en": ["Acai berries","Barberries","Blackberries","Blueberries","Cherries","Cranberries","Goji berries","Grapes (red/purple)","Kumquats","Mulberries","Raspberries","Strawberries"]
      }
    }'::jsonb),

    ('other-fruits', '{
      "servings": {
        "de": ["1 mittelgrosse Frucht","60g geschnittenes Obst","40g getrocknetes Obst","60ml Saft"],
        "en": ["1 medium fruit","60g cut fruit","40g dried fruit","60ml juice"]
      },
      "types": {
        "de": ["Äpfel","Aprikosen","Avocados","Bananen","Cantaloupe-Melone","Clementinen","Datteln","Feigen","Grapefruit","Honigmelone","Kiwi","Zitronen","Lychees","Mangos","Nektarinen","Orangen","Papayas","Passionsfrüchte","Pfirsiche","Birnen","Ananas","Pflaumen","Granatäpfel","Mandarinen","Wassermelone"],
        "en": ["Apples","Apricots","Avocados","Bananas","Cantaloupe","Clementines","Dates","Figs","Grapefruit","Honeydew","Kiwifruit","Lemons","Lychees","Mangoes","Nectarines","Oranges","Papayas","Passion fruit","Peaches","Pears","Pineapple","Plums","Pomegranates","Tangerines","Watermelon"]
      }
    }'::jsonb),

    ('cruciferous', '{
      "servings": {
        "de": ["80g gehackt","15g Brüssel- oder Brokkoli-Sprossen"],
        "en": ["80g chopped","15g Brussels or broccoli sprouts"]
      },
      "types": {
        "de": ["Rucola","Pak-Choi","Brokkoli (inkl. Romanesco)","Rosenkohl","Kohl (grün/rot/Wirsing)","Blumenkohl","Collard-Blätter","Meerrettich","Grünkohl","Kohlrabi","Senfgrün","Radieschen","Rübengrün","Brunnenkresse"],
        "en": ["Arugula","Bok choy","Broccoli (incl. Romanesco)","Brussels sprouts","Cabbage (green/red/savoy)","Cauliflower","Collard greens","Horseradish","Kale","Kohlrabi","Mustard greens","Radish","Turnip greens","Watercress"]
      }
    }'::jsonb),

    ('greens', '{
      "servings": {
        "de": ["60g roh","90g gekocht"],
        "en": ["60g raw","90g cooked"]
      },
      "types": {
        "de": ["Rucola","Rote-Bete-Blätter","Collard-Blätter","Grünkohl","Mesclun-Mix","Sauerampfer","Spinat","Mangold"],
        "en": ["Arugula","Beet greens","Collard greens","Kale","Mesclun mix","Sorrel","Spinach","Swiss chard"]
      }
    }'::jsonb),

    ('other-veg', '{
      "servings": {
        "de": ["50g rohes Blattgemüse","80g rohes Gemüse (nicht Blatt)","80g gekocht","60ml Gemüsesaft"],
        "en": ["50g raw leafy","80g raw non-leafy","80g cooked","60ml vegetable juice"]
      },
      "types": {
        "de": ["Artischocken","Spargel","Rote Bete","Paprika","Karotten","Mais","Knoblauch","Pilze","Okra","Zwiebeln","Kürbis","Zuckerschoten","Sommerkürbis","Süsskartoffeln","Tomaten","Zucchini"],
        "en": ["Artichokes","Asparagus","Beets","Bell peppers","Carrots","Corn","Garlic","Mushrooms","Okra","Onions","Pumpkin","Snap peas","Squash","Sweet potatoes","Tomatoes","Zucchini"]
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
        "en": ["30g nuts or seeds","2 tablespoons nut/seed butter"]
      },
      "types": {
        "de": ["Mandeln","Paranüsse","Cashews","Chiasamen","Haselnüsse","Hanfsamen","Macadamia-Nüsse","Pecannüsse","Pistazien","Kürbiskerne","Sesamsamen","Sonnenblumenkerne","Walnüsse"],
        "en": ["Almonds","Brazil nuts","Cashews","Chia seeds","Hazelnuts","Hemp seeds","Macadamia","Pecans","Pistachios","Pumpkin seeds","Sesame seeds","Sunflower seeds","Walnuts"]
      }
    }'::jsonb),

    ('herbs-spices', '{
      "servings": {
        "de": ["1/4 Teelöffel Kurkuma","alle anderen Kräuter und Gewürze nach Geschmack"],
        "en": ["1/4 teaspoon turmeric","any other herbs and spices to taste"]
      },
      "types": {
        "de": ["Koriander","Kreuzkümmel","Currypulver","Dill","Bockshornklee","Knoblauch","Ingwer","Zitronengras","Majoran","Muskatnuss","Oregano","Petersilie","Pfefferminze","Rosmarin","Safran","Salbei","Thymian","Kurkuma","Vanille"],
        "en": ["Coriander","Cumin","Curry powder","Dill","Fenugreek","Garlic","Ginger","Lemongrass","Marjoram","Nutmeg","Oregano","Parsley","Peppermint","Rosemary","Saffron","Sage","Thyme","Turmeric","Vanilla"]
      }
    }'::jsonb),

    ('whole-grains', '{
      "servings": {
        "de": ["100g Heissbrei oder gekochtes Getreide","50g Kaltmüsli","1 Tortilla oder Brotscheibe","60g gekochte Pasta","80g Popcorn"],
        "en": ["100g hot cereal or cooked grain","50g cold cereal","1 tortilla or slice of bread","60g cooked pasta","80g popcorn"]
      },
      "types": {
        "de": ["Gerste","Brauner Reis","Buchweizen","Hirse","Hafer","Popcorn","Quinoa","Roggen","Teff","Vollkornpasta","Wildreis"],
        "en": ["Barley","Brown rice","Buckwheat","Millet","Oats","Popcorn","Quinoa","Rye","Teff","Whole-wheat pasta","Wild rice"]
      }
    }'::jsonb),

    ('beverages', '{
      "servings": {
        "de": ["1 Glas (350ml) Wasser","1 Tasse Grüntee"],
        "en": ["1 glass (350ml) water","1 cup green tea"]
      },
      "types": {
        "de": ["Wasser","Grüntee","Hibiskustee","Weisser Tee","Kamillentee","Rooibostee","Pfefferminztee","Heisse Schokolade (Kakao-basiert)"],
        "en": ["Water","Green tea","Hibiscus tea","White tea","Chamomile tea","Rooibos tea","Peppermint tea","Hot chocolate (cocoa-based)"]
      }
    }'::jsonb),

    ('exercise', '{
      "servings": {
        "de": ["90 Minuten mittlere Intensität","40 Minuten hohe Intensität"],
        "en": ["90 minutes moderate-intensity","40 minutes vigorous-intensity"]
      },
      "types": {
        "de": ["Fahrradfahren","Kanufahren","Tanzen","Abfahrtski","Gartenarbeit","Golf","Wandern","Hausarbeit","Eislaufen","Seilspringen","Rollerskaten","Basketball schiessen","Leichtes Schneeschaufeln","Skateboarden","Schnorcheln","Surfen","Freizeitschwimmen","Eisschnelllauf","Squash","Step-Aerobic","Schwimmbahnen","Bergauf gehen (schnell)","Wasserjogging"],
        "en": ["Bicycling","Canoeing","Dancing","Downhill skiing","Gardening","Golf","Hiking","Housework","Ice skating","Jumping rope","Roller blading","Shooting baskets","Shoveling light snow","Skateboarding","Snorkeling","Surfing","Swimming recreationally","Speed skating","Squash","Step aerobics","Swimming laps","Walking briskly uphill","Water jogging"]
      }
    }'::jsonb)
)
UPDATE daily_dozen_categories c
SET details = cd.details
FROM category_details cd
WHERE c.slug = cd.slug;
