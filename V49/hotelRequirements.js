// --- START OF FILE hotelRequirements.js ---
export const HOTEL_REQUIREMENTS = {
    "1-star": {
        "Public Areas": [
            { code: "1.1.1.02", type: "O", text: "Clear exterior signage, visible from main road, with Arabic & English names at 50% each." },
            { code: "1.1.1.02", type: "L", text: "Hotel entrance clearly identifiable and illuminated at night." },
            { code: "1.1.2.03", type: "L", text: "All entrance areas have access for disabled guests." },
            { code: "1.1.2.04", type: "O", text: "Lobby and reception area with seating provided." },
            { code: "1.1.2.04", type: "O", text: "Free wireless in all areas and rooms (512 Kbps upload / 1 Mbps download)." },
            { code: "1.1.2.13", type: "L", text: "1 set of public toilets for gents & ladies on the same floor as outlets." },
            { code: "1.1.2.13", type: "L", text: "**At least 1 independent toilet for disabled guests." },
            { code: "1.1.2.09", type: "L", text: "**If 2 levels or more, guest lift is present and travels to all floors." },
        ],
        "Food & Beverage": [
            { code: "2.2.1.06", type: "L", text: "**Minimum of 1 restaurant available for all day dining." },
            { code: "2.2.1.06", type: "L", text: "Seating provided for at least 50% of keys." },
            { code: "2.3.1.12", type: "O", text: "Breakfast, lunch, and dinner available." },
            { code: "2.3.1.14", type: "O", text: "At least Continental breakfast offered." },
        ],
        "Bedroom": [
            { code: "6.1.1.01", type: "L", text: "Minimum 10 rooms." },
            { code: "6.1.1.01", type: "L", text: "Minimum 1 room with disabled facilities (scales with total room count)." },
            { code: "6.1.1.01", type: "L", text: "Minimum room size of 13 sqm (including bathroom)." },
            { code: "6.1.1.01", type: "L", text: "**Bathroom with shower only, minimum 3.5 sqm." },
            { code: "6.1.2.03", type: "L", text: "Individual switches for lighting and in-room A/C controls." },
            { code: "6.1.2.02", type: "L", text: "Each room has an entrance door with spy hole and automatic/secondary locking." },
            { code: "6.2.1.08", type: "O", text: "Double bed size minimum 150cm x 190cm." },
            { code: "6.2.2.10", type: "L", text: "**Wardrobe dimensions at least 60cm deep, with minimum 5 hangers." },
            { code: "6.4.1.15", type: "O", text: "Colour TV, free of charge, with local channels." },
        ],
         "Bathroom": [
            { code: "7.1.1.01", type: "L", text: "En-suite bathroom in each room." },
            { code: "7.1.1.02", type: "L", text: "Shower or shower over bath present." },
            { code: "7.1.1.04", type: "L", text: "Hot and cold water available with strong flow." },
            { code: "7.2.1.06", type: "O", text: "One set of towels per person (1 hand, 1 bath)." },
        ],
    },
    "2-star": {
        "Message": "Data for 2-Star hotels is not available in the provided documents."
    },
    "3-star": {
        "Public Areas": [
            { code: "1.1.2.04", type: "L", text: "Clearly designated lobby / reception area." },
            { code: "1.1.2.04", type: "O", text: "Seating for at least 5% of keys." },
            { code: "1.1.2.09", type: "L", text: "**Main building: If 2 levels or more, guest lift present." },
            { code: "1.1.2.13", type: "L", text: "**1 set of public toilets for gents and ladies near outlets." },
            { code: "1.1.2.14", type: "L", text: "**Prayer area on site (16 sqm min) or a Masjid is available within 500m."}
        ],
        "Food & Beverage": [
             { code: "2.2.1.06", type: "L", text: "**Minimum of 1 restaurant available for all day dining." },
             { code: "2.3.1.13", type: "O", text: "Buffet items are consistently replenished and correctly labelled." },
             { code: "2.4.1.19", type: "O", text: "Food & Beverage room service available from 6am to 11pm."}
        ],
        "Bedroom": [
            { code: "6.1.1.01", type: "L", text: "Minimum 10 rooms." },
            { code: "6.1.1.01", type: "L", text: "Minimum room size of 16 sqm (including bathroom)." },
            { code: "6.1.1.01", type: "L", text: "**Bathroom: 3.8 sqm with tub/shower, 3.5 sqm with shower only." },
            { code: "6.1.2.03", type: "L", text: "Lighting master switch, or power shut off at door (e.g. key card)." },
            { code: "6.2.2.10", type: "L", text: "**Wardrobe dimensions at least: 60cm deep, 30cm wide per person." },
            { code: "6.2.3.12", type: "O", text: "Safety Deposit Box provided in 50% of all bedrooms." },
        ],
        "Bathroom": [
            { code: "7.1.1.02", type: "E", text: "At least 25% of all rooms have a bathtub." },
            { code: "7.1.1.05", type: "L", text: "Conveniently located electric shaver point." },
            { code: "7.2.1.07", type: "O", text: "Individually packaged soap, shower gel, and shampoo provided." },
        ]
    },
    "4-star": {
        "Public Areas": [
            { code: "1.1.1.01", type: "L", text: "Car parking spaces available and approved by Dubai Municipality." },
            { code: "1.1.2.04", type: "E", text: "1 ATM Machine may be available for guest use." },
            { code: "1.1.2.09", type: "L", text: "**Main Building: 2+ levels, guest lift. External Building: 3+ levels, guest lift." },
            { code: "1.1.2.11", type: "L", text: "Separate service/delivery and staff entrances." },
            { code: "4.9.1.13", type: "L", text: "Business centre services or a dedicated facility exists." },
        ],
        "Food & Beverage": [
            { code: "2.2.1.06", type: "L", text: "**At least 2 restaurant facilities available, one with all day dining." },
            { code: "2.2.1.06", type: "L", text: "Seating provided equivalent to not less than 70% of keys." },
            { code: "2.4.1.19", type: "O", text: "Food & Beverage service provided 24 hours." },
            { code: "2.5.1.22", type: "O", text: "Selection of lounge, arm chairs and bar stools available in Bar/Lounge." }
        ],
        "Leisure": [
            { code: "5.1.3.06", type: "L", text: "Gymnasium present." },
            { code: "5.1.6.10", type: "L", text: "Hotel has at least one pool, indoors or outdoors. All pools temperature controlled." },
        ],
        "Bedroom": [
            { code: "6.1.1.01", type: "L", text: "Minimum room size of 22 sqm (including bathroom)." },
            { code: "6.1.1.01", type: "L", text: "**Bathroom: 3.8 sqm with tub/shower, 3.5 sqm with shower only." },
            { code: "6.2.1.08", type: "O", text: "Single Bed size minimum 120cm x 200cm. Double bed size minimum 180cm x 200cm." },
            { code: "6.2.3.11", type: "O", text: "Minibar stocked with snacks and soft beverages." },
            { code: "6.3.1.14", type: "L", text: "At least 3 available sockets for guest use." },
        ],
        "Suite": [
            { code: "8.3.2.01", type: "L", text: "5% of total inventory must be suites (2 separate rooms)." },
            { code: "8.3.2.01", type: "L", text: "**Minimum suite size 42 sqm." }
        ]
    },
    "5-star": {
        "Public Areas": [
            { code: "1.1.2.10", type: "L", text: "**Separate lift for hotel services (luggage, laundry)." },
            { code: "4.7.1.11", type: "O", text: "24 hour concierge service is provided." },
            { code: "4.7.1.11", type: "O", text: "Valet parking service available 24 hours." },
            { code: "4.9.1.17", type: "L", text: "**At least 1 Retail Shop and 1 Gift Shop provided." },
        ],
        "Leisure": [
            { code: "5.1.1.02", type: "L", text: "If Spa exists, minimum of 3 treatment rooms." },
            { code: "5.1.4.07", type: "L", text: "Kids club in a specially built facility." },
            { code: "5.1.6.10", type: "L", text: "At least one certified Lifeguard on duty during stated hours of operation." },
        ],
        "Bedroom": [
            { code: "6.1.1.01", type: "L", text: "Minimum 30 sqm (including bathroom)." },
            { code: "6.1.1.01", type: "L", text: "**Bathroom: Minimum 4.5 sqm." },
            { code: "6.1.2.07", type: "E", text: "Room features include cornices, artwork, artefacts, framed mirrors." },
            { code: "6.2.1.08", type: "O", text: "**Double bed size minimum 200cm x 200cm." },
            { code: "6.2.3.12", type: "O", text: "**Safety Deposit Box Provided to fit 17\" laptop." },
        ],
         "Suite": [
            { code: "8.3.2.01", type: "L", "text": "5% of total inventory must have 2 separate rooms (i.e. separate Lounge divided by a wall)." },
            { code: "8.3.2.01", type: "L", "text": "**Minimum 54 sqm (including Master bedroom and master bathroom, living areas)." },
            { code: "8.3.2.01", type: "L", "text": "Kitchenette / Butlers Pantry provided in highest category suite." }
        ],
        "Housekeeping": [
            { code: "9.1.1.01", type: "O", text: "Room Cleaning service provided daily between 6am-10pm." },
            { code: "9.1.1.01", type: "O", text: "Turn down service provided 6-10pm." },
            { code: "9.1.1.03", type: "O", text: "Same day Laundry & Dry Cleaning service provided 7 days of week." },
            { code: "9.1.1.05", type: "O", text: "24 hour shoe cleaning service available free of charge." },
        ]
    },
    "6-star": {
        "Message": "Data for 6-Star hotels is not available. Please refer to official documentation."
    },
    "7-star": {
        "Message": "Data for 7-Star hotels is not available. Please refer to official documentation."
    }
};
// --- END OF FILE hotelRequirements.js ---