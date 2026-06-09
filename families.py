# Family and Student data structures
# Each family is a dictionary containing parent info and a list of their students
# Each student is a dictionary nested inside the family

families = [
    {
        "family_id": 1,  # This is the lottery number assigned when form is received
        "family_name": "Smith",
        "dismissal_method": "car",  # car, JCC, or walker
        "parent_name": "John Smith",
        "phone": "754-555-1234",
        "email": "john.smith@email.com",
        "authorized_pickups": ["Jane Smith", "Bob Smith"],
        "students": [
            {
                "name": "Emily Smith",
                "grade": 1,
                "teacher": "Mrs. Johnson",
                "choices": ["Amazing Art Club", "Recipe Club", "Sports Club"],
                "assigned_club": None,  # Filled in after lottery runs
                "waitlist": []          # Clubs they are waitlisted for
            },
            {
                "name": "Jake Smith",
                "grade": 4,
                "teacher": "Mr. Davis",
                "choices": ["Mind Matters", "Piecemakers Quilting Club"],  # Only 2 valid clubs for grade 4
                "assigned_club": None,
                "waitlist": []
            }
        ]
    },
    {
        "family_id": 2,
        "family_name": "Garcia",
        "dismissal_method": "JCC",
        "parent_name": "Maria Garcia",
        "phone": "754-555-5678",
        "email": "maria.garcia@email.com",
        "authorized_pickups": ["Carlos Garcia"],
        "students": [
            {
                "name": "Sofia Garcia",
                "grade": 2,
                "teacher": "Ms. Brown",
                "choices": ["Sports Club", "Amazing Art Club", "Recipe Club"],
                "assigned_club": None,
                "waitlist": []
            }
        ]
    },
    {
        "family_id": 3,
        "family_name": "Johnson",
        "dismissal_method": "walker",
        "parent_name": "Lisa Johnson",
        "phone": "754-555-9012",
        "email": "lisa.johnson@email.com",
        "authorized_pickups": [],
        "students": [
            {
                "name": "Tyler Johnson",
                "grade": 3,
                "teacher": "Mrs. Wilson",
                "choices": ["Mind Matters", "Piecemakers Quilting Club"],  # Removed invalid grade choice
                "assigned_club": None,
                "waitlist": []
            },
            {
                "name": "Mia Johnson",
                "grade": 5,
                "teacher": "Mr. Lee",
                "choices": ["Piecemakers Quilting Club", "Mind Matters"],  # Removed invalid grade choice
                "assigned_club": None,
                "waitlist": []
            },
            {
                "name": "Owen Johnson",
                "grade": 1,
                "teacher": "Ms. Clark",
                "choices": ["Recipe Club", "Sports Club", "Amazing Art Club"],
                "assigned_club": None,
                "waitlist": []
            }
        ]
    }
]

# Print each family and their students to verify data looks correct
if __name__ == "__main__":
    for family in families:
        print(f"Family: {family['family_name']} (ID: {family['family_id']})")
        print(f"  Parent: {family['parent_name']}")
        print(f"  Dismissal: {family['dismissal_method']}")
        print(f"  Students:")
        for student in family['students']:
            print(f"    - {student['name']} (Grade {student['grade']})")
            print(f"      Choices: {student['choices']}")
        print()