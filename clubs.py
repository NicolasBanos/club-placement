# Club data structure
# Each club is a dictionary containing all the information needed
# for the lottery and output generation

clubs = [
    {
        "name": "Amazing Art Club",
        "instructor": "Mr. Smith",
        "grade_min": 0,  # Kindergarten = 0
        "grade_max": 2,
        "max_students": 20,
        "room_number": "Room 101",
        "dismissal_location": "North Side Parking Lot",
        "meeting_dates": [
            "2024-10-28",
            "2024-11-04",
            "2024-11-11",
            "2024-11-18",
            "2024-11-25",
            "2024-12-02",
            "2024-12-09",
            "2024-12-16"
        ],
        "description": "Students will learn how words, colors, and images work together.",
        "enrolled": []
    },
    {
        "name": "Mind Matters",
        "instructor": "Ms. Hagan",
        "grade_min": 3,
        "grade_max": 5,
        "max_students": 20,
        "room_number": "Room 205",
        "dismissal_location": "South Side Parking Lot",
        "meeting_dates": [
            "2024-10-28",
            "2024-11-04",
            "2024-11-11",
            "2024-11-18",
            "2024-11-25",
            "2024-12-02",
            "2024-12-09",
            "2024-12-16"
        ],
        "description": "Students will be taught how to play board games designed to work the brain.",
        "enrolled": []
    },
    {
        "name": "Sports Club",
        "instructor": "Coach Ottens",
        "grade_min": 0,  # Kindergarten = 0
        "grade_max": 2,
        "max_students": 25,
        "room_number": "Gymnasium",
        "dismissal_location": "North Side Parking Lot",
        "meeting_dates": [
            "2024-10-28",
            "2024-11-04",
            "2024-11-11",
            "2024-11-18",
            "2024-11-25",
            "2024-12-02",
            "2024-12-09",
            "2024-12-16"
        ],
        "description": "Fun and games learning the rules of team sports like basketball, kickball, and volleyball.",
        "enrolled": []
    },
    {
        "name": "Piecemakers Quilting Club",
        "instructor": "Mrs. Dilks",
        "grade_min": 3,
        "grade_max": 5,
        "max_students": 15,
        "room_number": "Room 312",
        "dismissal_location": "South Side Parking Lot",
        "meeting_dates": [
            "2024-10-28",
            "2024-11-04",
            "2024-11-11",
            "2024-11-18",
            "2024-11-25",
            "2024-12-02",
            "2024-12-09",
            "2024-12-16"
        ],
        "description": "Students will learn basic sewing skills and complete an individual patchwork quilt.",
        "enrolled": []
    },
    {
        "name": "Recipe Club",
        "instructor": "Mrs. Miles",
        "grade_min": 0,  # Kindergarten = 0
        "grade_max": 2,
        "max_students": 20,
        "room_number": "Room 108",
        "dismissal_location": "North Side Parking Lot",
        "meeting_dates": [
            "2024-10-28",
            "2024-11-04",
            "2024-11-11",
            "2024-11-18",
            "2024-11-25",
            "2024-12-02",
            "2024-12-09",
            "2024-12-16"
        ],
        "description": "Students will learn the art of cooking through fun recipes made without heat.",
        "enrolled": []
    }
]

# Print each club to verify the data looks correct
for club in clubs:
    print(f"Club: {club['name']}")
    print(f"  Instructor: {club['instructor']}")
    print(f"  Grades: {club['grade_min']} - {club['grade_max']}")
    print(f"  Max Students: {club['max_students']}")
    print(f"  Room: {club['room_number']}")
    print(f"  Dismissal: {club['dismissal_location']}")
    print(f"  Dates: {len(club['meeting_dates'])} meetings")
    print()