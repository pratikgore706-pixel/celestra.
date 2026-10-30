"""Offline fallbacks, used when the live OpenStreetMap services are slow or down.

SITES: notable real stargazing-friendly places in India (observatories, dark-sky sites,
forts and hill viewpoints). Coordinates are approximate (to ~1 km) and labelled as such
in the UI; each links to the map at that point so it can be checked.
CITIES: large cities (population > ~1 million) for the light-pollution estimate.
"""

# (name, type, lat, lon)
SITES = [
    # observatories
    ("IUCAA Girawali Observatory", "observatory", 19.083, 73.833),
    ("GMRT Radio Telescope, Khodad", "observatory", 19.096, 74.050),
    ("Vainu Bappu Observatory, Kavalur", "observatory", 12.577, 78.826),
    ("Indian Astronomical Observatory, Hanle", "observatory", 32.779, 78.964),
    ("Devasthal Observatory (ARIES)", "observatory", 29.361, 79.684),
    ("ARIES Manora Peak, Nainital", "observatory", 29.360, 79.457),
    ("Mount Abu Infrared Observatory", "observatory", 24.654, 72.779),
    ("Udaipur Solar Observatory", "observatory", 24.603, 73.674),
    ("Kodaikanal Solar Observatory", "observatory", 10.232, 77.465),
    ("Nehru Planetarium, New Delhi", "observatory", 28.601, 77.199),
    # dark-sky and high-altitude sites
    ("Hanle Dark Sky Reserve", "viewpoint", 32.790, 78.980),
    ("Pangong Tso shore, Spangmik", "viewpoint", 33.944, 78.457),
    ("Kaza, Spiti Valley", "viewpoint", 32.226, 78.072),
    ("Chandratal Lake", "viewpoint", 32.475, 77.617),
    ("White Rann, Dhordo", "viewpoint", 23.833, 69.750),
    ("Sam Sand Dunes, Jaisalmer", "viewpoint", 26.842, 70.555),
    ("Tiger Hill, Darjeeling", "viewpoint", 26.995, 88.290),
    ("Sandakphu", "peak", 27.106, 88.004),
    ("Auli", "viewpoint", 30.528, 79.566),
    ("Chopta - Tungnath", "peak", 30.488, 79.216),
    ("Kanatal", "viewpoint", 30.408, 78.343),
    ("Bir Billing", "viewpoint", 32.044, 76.723),
    ("Neemrana Fort", "peak", 27.988, 76.384),
    ("Sariska", "park", 27.316, 76.437),
    ("Kumbhalgarh Fort", "peak", 25.149, 73.583),
    ("Guru Shikhar, Mount Abu", "peak", 24.649, 72.778),
    ("Dhupgarh, Pachmarhi", "peak", 22.453, 78.379),
    ("Lonar Crater Lake", "viewpoint", 19.976, 76.508),
    # Maharashtra / Pune / Mumbai
    ("Sinhagad Fort", "peak", 18.366, 73.755),
    ("Rajgad Fort", "peak", 18.246, 73.682),
    ("Torna Fort", "peak", 18.276, 73.623),
    ("Harishchandragad", "peak", 19.387, 73.778),
    ("Kalsubai Peak", "peak", 19.601, 73.709),
    ("Rajmachi Fort", "peak", 18.828, 73.405),
    ("Tiger's Leap, Lonavala", "viewpoint", 18.713, 73.392),
    ("Bhimashankar", "shrine", 19.072, 73.536),
    ("Arthur's Seat, Mahabaleshwar", "viewpoint", 17.947, 73.646),
    ("Table Land, Panchgani", "viewpoint", 17.923, 73.795),
    ("Panorama Point, Matheran", "viewpoint", 19.015, 73.270),
    ("Pawna Lake", "viewpoint", 18.680, 73.490),
    ("Sandhan Valley, Samrad", "viewpoint", 19.517, 73.721),
    ("Tadoba Andhari", "park", 20.250, 79.370),
    # South
    ("Nandi Hills", "viewpoint", 13.370, 77.683),
    ("Savandurga", "peak", 12.919, 77.293),
    ("Skandagiri", "peak", 13.426, 77.680),
    ("Kudremukh", "peak", 13.142, 75.258),
    ("Mullayanagiri", "peak", 13.391, 75.721),
    ("Kodachadri", "peak", 13.861, 74.875),
    ("Doddabetta, Ooty", "peak", 11.402, 76.736),
    ("Top Station, Munnar", "viewpoint", 10.124, 77.244),
    ("Ponmudi", "viewpoint", 8.759, 77.117),
    ("Yelagiri", "viewpoint", 12.582, 78.640),
    ("Matanga Hill, Hampi", "viewpoint", 15.336, 76.465),
    ("Gandikota Canyon", "viewpoint", 14.814, 78.287),
    ("Araku Valley", "viewpoint", 18.327, 82.877),
    # East / North-east
    ("Shillong Peak", "peak", 25.549, 91.874),
    ("Cherrapunji, Nohkalikai", "viewpoint", 25.271, 91.687),
    # North plains (near big cities)
    ("Damdama Lake", "viewpoint", 28.300, 77.130),
    ("Morni Hills", "viewpoint", 30.695, 77.087),
    ("Mussoorie, Lal Tibba", "viewpoint", 30.460, 78.095),
    ("Jim Corbett, Dhikala", "park", 29.550, 78.770),
]

# (name, lat, lon, population in millions, rough)
CITIES = [
    ("Delhi", 28.614, 77.209, 16), ("Mumbai", 19.076, 72.878, 12), ("Kolkata", 22.573, 88.364, 4.5),
    ("Bengaluru", 12.972, 77.594, 8.4), ("Chennai", 13.083, 80.270, 4.6), ("Hyderabad", 17.385, 78.487, 6.8),
    ("Ahmedabad", 23.023, 72.571, 5.6), ("Pune", 18.520, 73.856, 3.1), ("Surat", 21.170, 72.831, 4.5),
    ("Jaipur", 26.912, 75.787, 3.0), ("Lucknow", 26.847, 80.946, 2.8), ("Kanpur", 26.449, 80.332, 2.8),
    ("Nagpur", 21.146, 79.088, 2.4), ("Indore", 22.720, 75.858, 2.0), ("Bhopal", 23.260, 77.413, 1.8),
    ("Thane", 19.218, 72.978, 1.8), ("Visakhapatnam", 17.687, 83.218, 1.7), ("Patna", 25.594, 85.138, 1.7),
    ("Vadodara", 22.307, 73.181, 1.7), ("Ghaziabad", 28.669, 77.454, 1.6), ("Ludhiana", 30.901, 75.857, 1.6),
    ("Agra", 27.177, 78.008, 1.6), ("Nashik", 19.998, 73.790, 1.5), ("Faridabad", 28.408, 77.318, 1.4),
    ("Meerut", 28.984, 77.706, 1.3), ("Rajkot", 22.303, 70.802, 1.3), ("Varanasi", 25.318, 82.974, 1.2),
    ("Srinagar", 34.084, 74.797, 1.2), ("Amritsar", 31.634, 74.872, 1.1), ("Prayagraj", 25.436, 81.846, 1.1),
    ("Ranchi", 23.344, 85.310, 1.1), ("Coimbatore", 11.017, 76.956, 1.1), ("Jabalpur", 23.182, 79.987, 1.1),
    ("Gwalior", 26.218, 78.183, 1.1), ("Vijayawada", 16.506, 80.648, 1.0), ("Jodhpur", 26.239, 73.024, 1.0),
    ("Madurai", 9.925, 78.120, 1.0), ("Raipur", 21.251, 81.630, 1.0), ("Kota", 25.214, 75.864, 1.0),
    ("Chandigarh", 30.733, 76.779, 1.0), ("Guwahati", 26.144, 91.736, 1.0), ("Mysuru", 12.296, 76.639, 0.9),
    ("Kochi", 9.931, 76.267, 0.7), ("Thiruvananthapuram", 8.524, 76.937, 0.8), ("Bhubaneswar", 20.296, 85.825, 0.9),
    ("Dehradun", 30.317, 78.032, 0.7), ("Udaipur", 24.585, 73.712, 0.5), ("Nainital", 29.380, 79.464, 0.05),
    ("Leh", 34.153, 77.577, 0.03), ("Darjeeling", 27.036, 88.263, 0.12), ("Shillong", 25.578, 91.893, 0.35),
]
