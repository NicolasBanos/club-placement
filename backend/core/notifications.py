import firebase_admin
from firebase_admin import credentials, messaging
import os

# Initialize Firebase app only once
_firebase_initialized = False


def initialize_firebase():
    """Initialize Firebase with credentials file"""
    global _firebase_initialized
    if not _firebase_initialized:
        cred_path = os.path.join(os.path.dirname(__file__), '..', 'firebase-credentials.json')
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True


def send_push_notification(device_token: str, title: str, body: str, data: dict = None):
    """
    Send a push notification to a specific device.
    
    device_token: the FCM token for the target device
    title: notification title
    body: notification body text
    data: optional extra data to send with the notification
    """
    initialize_firebase()

    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body
        ),
        data=data or {},
        token=device_token,
    )

    try:
        response = messaging.send(message)
        print(f"✅ Notification sent: {response}")
        return {"success": True, "message_id": response}
    except Exception as e:
        print(f"❌ Failed to send notification: {e}")
        return {"success": False, "error": str(e)}


def send_waitlist_promotion_notification(device_token: str, student_name: str, club_name: str):
    """Notify parent that their child was promoted from waitlist"""
    return send_push_notification(
        device_token=device_token,
        title="🎉 Club Spot Available!",
        body=f"{student_name} has been promoted from the waitlist and is now enrolled in {club_name}!",
        data={"type": "waitlist_promotion", "club_name": club_name}
    )


def send_absence_notification(device_token: str, student_name: str, club_name: str, deadline: str):
    """Notify admin that a student was absent on first day"""
    return send_push_notification(
        device_token=device_token,
        title="⚠️ Student Absence",
        body=f"{student_name} was absent from {club_name} on the first day. Excuse deadline: {deadline}",
        data={"type": "absence", "student_name": student_name}
    )


def send_excuse_decision_notification(device_token: str, student_name: str, approved: bool, club_name: str):
    """Notify parent of excuse decision"""
    if approved:
        return send_push_notification(
            device_token=device_token,
            title="✅ Excuse Approved",
            body=f"{student_name}'s absence from {club_name} has been excused. They remain enrolled!",
            data={"type": "excuse_approved"}
        )
    else:
        return send_push_notification(
            device_token=device_token,
            title="❌ Excuse Denied",
            body=f"{student_name}'s absence from {club_name} was not excused. They have been withdrawn.",
            data={"type": "excuse_denied"}
        )


def send_message_notification(device_token: str, sender_name: str, preview: str):
    """Notify user of a new message"""
    return send_push_notification(
        device_token=device_token,
        title=f"💬 New message from {sender_name}",
        body=preview,
        data={"type": "message"}
    )


def send_pickup_reminder_notification(device_token: str, student_name: str, pickup_time: str, location: str):
    """Send pickup reminder 1 hour before club ends"""
    return send_push_notification(
        device_token=device_token,
        title="🚗 Pickup Reminder",
        body=f"{student_name} needs to be picked up at {pickup_time} from {location}",
        data={"type": "pickup_reminder", "location": location}
    )