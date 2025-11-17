export const uaeLocations = {
  "United Arab Emirates": {
    "Abu Dhabi": {
      "Abu Dhabi City": [
        "Corniche",
        "Al Reem Island",
        "Al Khalidiya",
        "Al Mushrif",
        "Tourist Club Area",
        "Madinat Zayed"
      ],
      "Mussafah": [
        "Mussafah Industrial",
        "Shabiya 10",
        "Shabiya 12",
        "ICAD"
      ],
      "Khalifa City": [
        "Khalifa City A",
        "Khalifa City B",
        "Al Raha Gardens",
        "Al Forsan Village"
      ],
      "Al Ain": [
        "Al Jimi",
        "Al Maqam",
        "Al Mutarad",
        "Hili",
        "Zakher",
        "Sarooj"
      ],
      "Baniyas": [
        "Baniyas East",
        "Baniyas West"
      ],
      "Mafraq": [
        "New Mafraq",
        "Old Mafraq"
      ]
    },
    "Dubai": {
      "Deira": [
        "Naif",
        "Hor Al Anz",
        "Al Muraqqabat",
        "Port Saeed"
      ],
      "Bur Dubai": [
        "Karama",
        "Oud Metha",
        "Al Mankhool",
        "Al Raffa"
      ],
      "Al Nahda": [
        "Al Nahda 1",
        "Al Nahda 2"
      ],
      "Jumeirah": [
        "Jumeirah 1",
        "Jumeirah 2",
        "Jumeirah 3",
        "City Walk"
      ],
      "Business Bay": [
        "Bay Square",
        "Marasi Drive"
      ],
      "Al Barsha": [
        "Al Barsha 1",
        "Al Barsha 2",
        "Al Barsha 3",
        "Barsha Heights (Tecom)"
      ],
      "Dubai Marina": [
        "Jumeirah Beach Residence (JBR)",
        "Marina Walk",
        "Bluewaters Island"
      ],
      "Jebel Ali": [
        "Jebel Ali Industrial",
        "Jebel Ali Free Zone (JAFZA)",
        "Jebel Ali Village"
      ],
      "Other Areas": [
        "Al Quoz",
        "Al Qusais",
        "Mirdif",
        "Downtown Dubai",
        "Silicon Oasis",
        "Discovery Gardens",
        "International City",
        "Dubai South"
      ]
    },
    "Sharjah": {
      "Sharjah City": [
        "Al Majaz",
        "Al Qasimia",
        "Al Nahda",
        "Al Taawun",
        "Al Khan"
      ],
      "Industrial Area": [
        "Industrial 1",
        "Industrial 2",
        "Industrial 3",
        "Industrial 4",
        "Industrial 5",
        "Industrial 6",
        "Industrial 7",
        "Industrial 8",
        "Industrial 9",
        "Industrial 10"
      ],
      "Muweilah": [
        "University City",
        "Muweilah Commercial"
      ],
      "Other Areas": [
        "Al Sajaa",
        "Al Suyoh",
        "Al Rahmaniya"
      ]
    },
    "Ajman": {
      "Ajman City": [
        "Ajman Corniche",
        "Al Nuaimiya",
        "Al Rashidiya",
        "Al Rumailah",
        "Al Jurf"
      ],
      "Al Rawda": [
        "Al Rawda 1",
        "Al Rawda 2",
        "Al Rawda 3"
      ],
      "Industrial Area": [
        "New Industrial Area",
        "Old Industrial Area"
      ]
    },
    "Umm Al Quwain": {
      "UAQ City": [
        "King Faisal Street",
        "Old Town",
        "Industrial Area"
      ],
      "Al Salama": [
        "Al Salama 1",
        "Al Salama 2"
      ]
    },
    "Ras Al Khaimah": {
      "RAK City": [
        "Al Nakheel",
        "Al Dhait North",
        "Al Dhait South",
        "Al Hamra Village",
        "Al Jazirah Al Hamra"
      ],
      "Other Areas": [
        "Al Rams",
        "Khuzam",
        "Julphar",
        "RAK Industrial Area"
      ]
    },
    "Fujairah": {
      "Fujairah City": [
        "Dibba",
        "Kalba",
        "Al Faseel",
        "Sakamkam",
        "Madhab"
      ],
      "Other Areas": [
        "Mirbah",
        "Qidfa",
        "Dibba Al Hisn"
      ]
    }
  }
}

export const uaeEmirates = Object.keys(uaeLocations["United Arab Emirates"])

export const getCitiesForEmirate = (emirate: string): string[] => {
  const uaeData = uaeLocations["United Arab Emirates"] as Record<string, Record<string, string[]>>
  if (!emirate || !uaeData[emirate]) {
    return []
  }
  return Object.keys(uaeData[emirate])
}

export const getDistrictsForCity = (emirate: string, city: string): string[] => {
  const uaeData = uaeLocations["United Arab Emirates"] as Record<string, Record<string, string[]>>
  if (!emirate || !city || !uaeData[emirate]?.[city]) {
    return []
  }
  return uaeData[emirate][city]
}

