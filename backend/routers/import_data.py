from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from database.connection import get_db
from core.auth import require_coordinator
from core.spreadsheet_importer import read_spreadsheet, validate_spreadsheet, generate_template, import_students, rows_to_df, validate_rows
from models.user import User
from pydantic import BaseModel


class RowsPayload(BaseModel):
    rows: list[dict]

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

@router.post("/confirm")
def confirm_import(
    file: UploadFile = File(...),
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """
    Re-validate the uploaded spreadsheet and, if structurally valid,
    import the rows. Returns a detailed report of enrolled / waitlisted / skipped.
    """
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload .xlsx, .xls, or .csv"
        )
    content = file.file.read()
    try:
        df = read_spreadsheet(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    validation_report = validate_spreadsheet(df)
    if not validation_report.get("valid"):
        raise HTTPException(
            status_code=400,
            detail="Spreadsheet has validation errors. Please fix them before importing."
        )

    report = import_students(df, db, current_user.school_id)
    return {"filename": file.filename, "report": report}

@router.post("/parse")
def parse_upload(
    file: UploadFile = File(...),
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Upload a file and return its rows as JSON for the editable review grid."""
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload .xlsx, .xls, or .csv")
    content = file.file.read()
    try:
        df = read_spreadsheet(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Fill NaN with empty strings so JSON is clean and cells are editable
    df = df.fillna("")
    columns = list(df.columns)
    rows = df.to_dict(orient="records")
    # Coerce all values to strings for consistent editing in the grid
    rows = [{k: ("" if v == "" else str(v)) for k, v in row.items()} for row in rows]
    return {"filename": file.filename, "columns": columns, "rows": rows}


@router.post("/validate-rows")
def validate_edited_rows(
    payload: RowsPayload,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Validate edited rows from the grid; returns structured per-cell errors."""
    return validate_rows(payload.rows, db)


@router.post("/confirm-rows")
def confirm_edited_rows(
    payload: RowsPayload,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Re-validate edited rows and import them if structurally valid."""
    validation = validate_rows(payload.rows, db)
    if not validation.get("valid"):
        raise HTTPException(status_code=400, detail="Rows still have validation errors. Fix them before importing.")
    df = rows_to_df(payload.rows)
    report = import_students(df, db, current_user.school_id)
    return {"report": report}

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