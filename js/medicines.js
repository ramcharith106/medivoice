/**
 * medicines.js
 * ------------------------------------------------------------------
 * Built-in list of common Indian brand names and generic medicines.
 * Used by the fuzzy matcher in extract.js to recognise the medicine
 * name on a label even when OCR makes small mistakes
 * (e.g. "Paracetam0l" or "Pantopraz0le").
 *
 * Each entry is the name exactly as it should be shown and spoken.
 * Brand names that include a strength (e.g. "Dolo 650") are matched
 * as two-word phrases.
 *
 * This list is for recognition only. It is NOT a drug database and
 * does not contain dosing information.
 */

export const MEDICINES = [
  // ---- Pain, fever, inflammation ----
  'Paracetamol', 'Acetaminophen', 'Dolo 650', 'Dolo', 'Crocin', 'Calpol',
  'Ibuprofen', 'Brufen', 'Combiflam', 'Diclofenac', 'Voveran', 'Aceclofenac',
  'Zerodol', 'Naproxen', 'Nimesulide', 'Mefenamic Acid', 'Meftal', 'Aspirin',
  'Disprin', 'Ecosprin', 'Tramadol', 'Etoricoxib', 'Saridon',

  // ---- Diabetes ----
  'Metformin', 'Glycomet', 'Glimepiride', 'Amaryl', 'Gliclazide', 'Glipizide',
  'Sitagliptin', 'Januvia', 'Vildagliptin', 'Galvus', 'Teneligliptin',
  'Dapagliflozin', 'Empagliflozin', 'Jardiance', 'Pioglitazone', 'Voglibose',
  'Insulin', 'Glargine',

  // ---- Blood pressure and heart ----
  'Amlodipine', 'Amlong', 'Telmisartan', 'Telma', 'Losartan', 'Olmesartan',
  'Valsartan', 'Ramipril', 'Enalapril', 'Lisinopril', 'Atenolol', 'Metoprolol',
  'Bisoprolol', 'Carvedilol', 'Nebivolol', 'Propranolol', 'Hydrochlorothiazide',
  'Chlorthalidone', 'Furosemide', 'Lasix', 'Torsemide', 'Spironolactone',
  'Clopidogrel', 'Clopilet', 'Warfarin', 'Apixaban', 'Rivaroxaban',
  'Digoxin', 'Isosorbide', 'Nitroglycerin', 'Ranolazine', 'Cilnidipine',

  // ---- Cholesterol ----
  'Atorvastatin', 'Atorva', 'Rosuvastatin', 'Rosuvas', 'Simvastatin',
  'Fenofibrate', 'Ezetimibe',

  // ---- Stomach and acidity ----
  'Pantoprazole', 'Pan 40', 'Pantocid', 'Omeprazole', 'Omez', 'Rabeprazole',
  'Razo', 'Esomeprazole', 'Nexpro', 'Ranitidine', 'Famotidine', 'Domperidone',
  'Ondansetron', 'Emeset', 'Itopride', 'Sucralfate', 'Digene', 'Gelusil',
  'Lactulose', 'Bisacodyl', 'Loperamide', 'Racecadotril', 'Mebeverine',
  'Drotaverine', 'Dicyclomine', 'Cyclopam',

  // ---- Antibiotics and anti-infectives ----
  'Azithromycin', 'Azithral', 'Azee', 'Amoxicillin', 'Mox', 'Amoxyclav',
  'Augmentin', 'Clavam', 'Cefixime', 'Taxim', 'Cefuroxime', 'Cefpodoxime',
  'Ceftriaxone', 'Cephalexin', 'Ciprofloxacin', 'Ciplox', 'Ofloxacin',
  'Levofloxacin', 'Norfloxacin', 'Doxycycline', 'Metronidazole', 'Flagyl',
  'Tinidazole', 'Nitrofurantoin', 'Linezolid', 'Clarithromycin',
  'Fluconazole', 'Itraconazole', 'Terbinafine', 'Albendazole', 'Ivermectin',
  'Acyclovir', 'Valacyclovir', 'Hydroxychloroquine', 'Oseltamivir',

  // ---- Allergy, cold, cough, asthma ----
  'Cetirizine', 'Cetzine', 'Okacet', 'Levocetirizine', 'Levocet',
  'Fexofenadine', 'Allegra', 'Loratadine', 'Desloratadine', 'Bilastine',
  'Chlorpheniramine', 'Montelukast', 'Montair', 'Montek', 'Sinarest', 'Vicks',
  'Ambroxol', 'Bromhexine', 'Dextromethorphan', 'Benadryl', 'Ascoril',
  'Salbutamol', 'Asthalin', 'Levosalbutamol', 'Budesonide', 'Formoterol',
  'Deriphyllin', 'Theophylline', 'Prednisolone', 'Wysolone', 'Dexamethasone',
  'Methylprednisolone', 'Deflazacort',

  // ---- Thyroid ----
  'Levothyroxine', 'Thyronorm', 'Eltroxin', 'Thyrox', 'Carbimazole',

  // ---- Brain, nerves, sleep, mood ----
  'Gabapentin', 'Pregabalin', 'Pregalin', 'Amitriptyline', 'Nortriptyline',
  'Duloxetine', 'Sertraline', 'Escitalopram', 'Fluoxetine', 'Paroxetine',
  'Alprazolam', 'Clonazepam', 'Lorazepam', 'Diazepam', 'Zolpidem',
  'Levetiracetam', 'Phenytoin', 'Valproate', 'Carbamazepine',
  'Donepezil', 'Memantine', 'Levodopa', 'Ropinirole', 'Betahistine',
  'Cinnarizine', 'Flunarizine', 'Olanzapine', 'Risperidone', 'Quetiapine',

  // ---- Urinary and prostate ----
  'Tamsulosin', 'Urimax', 'Silodosin', 'Finasteride', 'Dutasteride',
  'Solifenacin', 'Tolterodine',

  // ---- Bones, vitamins, supplements ----
  'Calcium', 'Shelcal', 'Calcitriol', 'Cholecalciferol', 'Uprise',
  'Alendronate', 'Methylcobalamin', 'Neurobion', 'Becosules', 'Folic Acid',
  'Ferrous Sulphate', 'Livogen', 'Limcee', 'Zincovit', 'Supradyn',
  'Multivitamin', 'Allopurinol', 'Febuxostat', 'Colchicine',
  'Glucosamine', 'Thiocolchicoside', 'Methotrexate',

  // ---- Others ----
  'Sildenafil', 'Tadalafil', 'ORS', 'Electral', 'Povidone Iodine', 'Betadine',
  'Mupirocin', 'Clotrimazole', 'Candid', 'Silver Sulfadiazine',
];

/**
 * Normalise a medicine name or OCR token for comparison:
 * upper-case, keep letters and digits only.
 *   "Dolo 650" -> "DOLO650", "Pan-40" -> "PAN40"
 */
export function normaliseKey(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Pre-computed lookup entries: { name, key } */
export const MEDICINE_KEYS = MEDICINES.map((name) => ({ name, key: normaliseKey(name) }));
