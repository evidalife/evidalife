-- Migration: 20260318000007_fix_daily_dozen_details
-- Corrects and completes details for 5 categories based on Dr. Greger Daily Dozen app

WITH category_details (slug, details) AS (
  VALUES

    ('other-veg', '{
      "servings": {
        "de": ["60g rohes Blattgemüse","90g rohes oder gekochtes Nicht-Blattgemüse","120ml Gemüsesaft","10g getrocknete Pilze"],
        "en": ["60g raw leafy vegetables","90g raw or cooked non-leafy vegetables","120ml vegetable juice","10g dried mushrooms"]
      },
      "types": {
        "de": ["Artischocken","Spargel","Rote Bete","Paprika","Karotten","Mais","Knoblauch","Pilze (Champignon/Austern/Steinpilz/Portobello/Shiitake)","Okra","Zwiebeln","Lila Kartoffeln","Kürbis","Meeresgemüse (Arame/Dulse/Nori)","Zuckerschoten","Kürbis (Delicata/Sommer/Spaghetti)","Süsskartoffeln / Yams","Tomaten","Zucchini"],
        "en": ["Artichokes","Asparagus","Beets","Bell peppers","Carrots","Corn","Garlic","Mushrooms (button/oyster/porcini/portobello/shiitake)","Okra","Onions","Purple potatoes","Pumpkin","Sea vegetables (arame/dulse/nori)","Snap peas","Squash (delicata/summer/spaghetti)","Sweet potatoes/yams","Tomatoes","Zucchini"]
      }
    }'::jsonb),

    ('cruciferous', '{
      "servings": {
        "de": ["90g gekochtes Blattgemüse","90g rohes oder gekochtes Nicht-Blattgemüse","60g rohes Blattgemüse","20g Brokkolisprossen","1 Esslöffel Meerrettich"],
        "en": ["90g cooked leafy vegetables","90g raw or cooked non-leafy vegetables","60g raw leafy vegetables","20g broccoli sprouts","1 tablespoon horseradish"]
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
        "de": ["Rucola","Rote-Bete-Blätter","Collard-Blätter","Grünkohl","Mesclun-Mix","Senfgrün","Sauerampfer","Spinat","Mangold","Stielmus"],
        "en": ["Arugula","Beet greens","Collard greens","Kale","Mesclun mix","Mustard greens","Sorrel","Spinach","Swiss chard","Turnip greens"]
      }
    }'::jsonb),

    ('nuts-seeds', '{
      "servings": {
        "de": ["30g Nüsse oder Samen","2 Esslöffel Nuss- oder Samenbutter"],
        "en": ["30g nuts or seeds","2 tablespoons nut/seed butter"]
      },
      "types": {
        "de": ["Mandeln","Paranüsse","Cashews","Chiasamen","Erdnüsse","Haselnüsse","Hanfsamen","Macadamia-Nüsse","Pecannüsse","Pistazien","Kürbiskerne","Sesamsamen","Sonnenblumenkerne","Walnüsse"],
        "en": ["Almonds","Brazil nuts","Cashews","Chia seeds","Peanuts","Hazelnuts","Hemp seeds","Macadamia","Pecans","Pistachios","Pumpkin seeds","Sesame seeds","Sunflower seeds","Walnuts"]
      }
    }'::jsonb),

    ('other-fruits', '{
      "servings": {
        "de": ["1 mittelgrosse Frucht","60g geschnittenes Obst","40g getrocknetes Obst","60ml Saft"],
        "en": ["1 medium fruit","60g cut fruit","40g dried fruit","60ml juice"]
      },
      "types": {
        "de": ["Äpfel","Aprikosen","Avocados","Bananen","Cantaloupe-Melone","Clementinen","Datteln","Feigen","Grapefruit","Honigmelone","Kiwi","Zitronen","Limetten","Lychees","Mangos","Nektarinen","Orangen","Papayas","Passionsfrüchte","Pfirsiche","Birnen","Ananas","Pflaumen (bes. schwarze)","Pluots","Granatäpfel","Backpflaumen","Mandarinen","Wassermelone"],
        "en": ["Apples","Apricots","Avocados","Bananas","Cantaloupe","Clementines","Dates","Figs","Grapefruit","Honeydew","Kiwifruit","Lemons","Limes","Lychees","Mangoes","Nectarines","Oranges","Papayas","Passion fruit","Peaches","Pears","Pineapple","Plums (esp. black)","Pluots","Pomegranates","Prunes","Tangerines","Watermelon"]
      }
    }'::jsonb)
)
UPDATE daily_dozen_categories c
SET details = cd.details
FROM category_details cd
WHERE c.slug = cd.slug;
