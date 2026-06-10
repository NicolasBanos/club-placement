import random

# All available clubs
clubs = [
    "Amazing Art Club",
    "Mind Matters",
    "Sports Club",
    "Piecemakers Quilting Club",
    "Recipe Club"
]

# Grade appropriate clubs
k2_clubs = ["Amazing Art Club", "Sports Club", "Recipe Club"]
grade35_clubs = ["Mind Matters", "Piecemakers Quilting Club"]

# Sample names for generating fake students
first_names = [
    "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason",
    "Isabella", "William", "Mia", "James", "Charlotte", "Benjamin", "Amelia",
    "Lucas", "Harper", "Henry", "Evelyn", "Alexander", "Sofia", "Michael",
    "Camila", "Elijah", "Luna", "Owen", "Gianna", "Daniel", "Ella", "Logan"
]

last_names = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
    "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"
]

teachers = [
    "Mrs. Johnson", "Mr. Davis", "Ms. Brown", "Mrs. Wilson", "Mr. Lee",
    "Ms. Clark", "Mrs. White", "Mr. Harris", "Ms. Lewis", "Mrs. Walker"
]

def get_grade_appropriate_choices(grade):
    """Return up to 3 valid club choices based on student grade.
    Never duplicates — if fewer than 3 clubs available, only returns what's valid."""
    if grade <= 2:
        available = k2_clubs.copy()
    else:
        available = grade35_clubs.copy()

    # Only return as many choices as there are available clubs
    # This prevents duplicates for grades 3-5 who only have 2 clubs
    num_choices = min(3, len(available))
    return random.sample(available, num_choices)

def generate_student(last_name, grade=None):
    """Generate a single fake student"""
    if grade is None:
        grade = random.randint(0, 5)  # K=0 through 5th grade
    
    return {
        "name": f"{random.choice(first_names)} {last_name}",
        "grade": grade,
        "teacher": random.choice(teachers),
        "choices": get_grade_appropriate_choices(grade),
        "assigned_club": None,
        "waitlist": []
    }

def generate_families(num_families=500):
    """Generate fake families based on real distribution"""
    families = []
    
    for i in range(1, num_families + 1):
        last_name = random.choice(last_names)
        
        # Determine number of students based on distribution
        # 87% = 1 student, 10% = 2 students, 3% = 3 students
        roll = random.random()
        if roll < 0.87:
            num_students = 1
        elif roll < 0.97:
            num_students = 2
        else:
            num_students = 3
        
        # Generate students with different grades per sibling
        students = []
        for _ in range(num_students):
            students.append(generate_student(last_name))
        
        family = {
            "family_id": i,
            "family_name": last_name,
            "dismissal_method": random.choice(["car", "JCC", "walker"]),
            "parent_name": f"{random.choice(first_names)} {last_name}",
            "phone": f"754-555-{random.randint(1000,9999)}",
            "email": f"{last_name.lower()}{i}@email.com",
            "authorized_pickups": [],
            "students": students
        }
        
        families.append(family)
    
    return families


if __name__ == "__main__":
    # Generate the families
    families = generate_families(500)
    # Print a summary
    total_students = sum(len(f["students"]) for f in families)
    one_kid = sum(1 for f in families if len(f["students"]) == 1)
    two_kids = sum(1 for f in families if len(f["students"]) == 2)
    three_kids = sum(1 for f in families if len(f["students"]) == 3)

    print(f"Generated {len(families)} families")
    print(f"Total students: {total_students}")
    print(f"Families with 1 student: {one_kid}")
    print(f"Families with 2 students: {two_kids}")
    print(f"Families with 3 students: {three_kids}")
    print()
    print("Sample of first 3 families:")
    for family in families[:3]:
        print(f"\nFamily: {family['family_name']} (ID: {family['family_id']})")
        print(f"  Dismissal: {family['dismissal_method']}")
        for student in family['students']:
            print(f"  - {student['name']} Grade {student['grade']}: {student['choices']}")