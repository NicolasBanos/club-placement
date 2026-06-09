import random
from families import families

def run_lottery(families):
    """
    Randomly shuffle the list of families to determine
    the order in which they will be processed in the lottery.
    Returns the shuffled list of families.
    """
    # Make a copy so we don't modify the original list
    lottery_order = families.copy()
    
    # Shuffle the list randomly
    random.shuffle(lottery_order)
    
    return lottery_order


def print_lottery_order(lottery_order):
    """
    Print the lottery order so we can verify it looks correct
    """
    print("=" * 50)
    print("LOTTERY ORDER")
    print("=" * 50)
    
    for position, family in enumerate(lottery_order, 1):
        num_students = len(family["students"])
        student_names = ", ".join(s["name"] for s in family["students"])
        print(f"{position}. Family {family['family_id']} - {family['family_name']} "
              f"({num_students} student{'s' if num_students > 1 else ''}: {student_names})")
    
    print("=" * 50)
    print(f"Total families in lottery: {len(lottery_order)}")
    print("=" * 50)


if __name__ == "__main__":
    lottery_order = run_lottery(families)
    print_lottery_order(lottery_order)
    
    # Run it twice to prove the order is different each time
    print("\nRunning lottery again to confirm randomness...")
    print()
    lottery_order2 = run_lottery(families)
    print_lottery_order(lottery_order2)