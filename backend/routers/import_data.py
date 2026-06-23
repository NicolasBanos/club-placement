from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from database.connection import get_db
from core.auth import require_coordinator
from core.spreadsheet_importer import read_spreadsheet, validate_spreadsheet, generate_template
from models.user import User

router = APIRouter(prefix="/import", tags=["Data Import"])


@router.post("/validate")
def validate_upload(
    file: UploadFile = File(...),
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """
    Upload and validate a spreadsheet before importing.
    Only coordinators can do this.
    """
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload .xlsx, .xls, or .csv"
        )

    content = file.file.read()

    try:
        df = read_spreadsheet(content, file.filename)
        validation_report = validate_spreadsheet(df)
        return {
            "filename": file.filename,
            "validation": validation_report
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/template")
def download_template(current_user: User = Depends(require_coordinator)):
    """
    Download the Excel template for coordinators to fill out.
    """
    template_bytes = generate_template()
    return Response(
        content=template_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=club_import_template.xlsx"}
    )