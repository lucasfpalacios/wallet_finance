import os
from typing import Optional, Literal, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from dotenv import load_dotenv
from models import Category, Transaction, Investment, Portfolio, Debt

load_dotenv()

MONGO_URI = os.environ["MONGO_URI"]
MONGO_DB = os.getenv("MONGO_DB", "finanzas_db")

WALLET_DOC_ID = "main_wallet"
PORTFOLIO_DOC_ID = "main_portfolio"

_db = None

def get_db():
    global _db
    if _db is None:
        try:
            client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
            _db = client[MONGO_DB]
        except PyMongoError as e:
            raise HTTPException(status_code=503, detail=f"MongoDB no disponible: {e}")
    return _db


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CategorySchema(BaseModel):
    name: str
    type: Literal["expense", "income"] = "expense"


class TransactionSchema(BaseModel):
    amount: float
    description: str
    category_name: str
    date: Optional[str] = None


class TransactionUpdateSchema(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    date: Optional[str] = None


class InvestmentSchema(BaseModel):
    ticker: str
    name: str
    type: str
    quantity: float
    purchase_price: float
    date: Optional[str] = None


class DebtSchema(BaseModel):
    creditor: str
    amount: float
    currency: str = "ARS"
    description: str = ""
    due_date: Optional[str] = None
    status: Literal["pending", "paid"] = "pending"


class DebtUpdateSchema(BaseModel):
    creditor: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[Literal["pending", "paid"]] = None


def load_wallet() -> Category:
    data = get_db()["wallet"].find_one({"_id": WALLET_DOC_ID})
    if data:
        return Category.from_dict(data)
    return Category("Mis Finanzas")


def save_wallet(wallet: Category) -> None:
    data = wallet.to_dict()
    data["_id"] = WALLET_DOC_ID
    get_db()["wallet"].replace_one({"_id": WALLET_DOC_ID}, data, upsert=True)


def load_portfolio() -> Portfolio:
    data = get_db()["investments"].find_one({"_id": PORTFOLIO_DOC_ID})
    if data:
        return Portfolio.from_dict(data)
    return Portfolio()


def save_portfolio(portfolio: Portfolio) -> None:
    data = portfolio.to_dict()
    data["_id"] = PORTFOLIO_DOC_ID
    get_db()["investments"].replace_one({"_id": PORTFOLIO_DOC_ID}, data, upsert=True)


@app.get("/api/report")
def get_report(month: Optional[str] = None):
    wallet = load_wallet()
    if month:
        wallet = wallet.filter_by_month(month)
    return wallet.to_dict()


@app.post("/api/category")
def add_category(data: CategorySchema):
    wallet = load_wallet()

    for cat in wallet.subcategories:
        if cat.name.lower() == data.name.lower():
            raise HTTPException(status_code=400, detail="La categoría ya existe")

    wallet.add_subcategory(Category(data.name, data.type))
    save_wallet(wallet)
    return {"message": f"Categoría '{data.name}' creada con éxito"}


@app.post("/api/transaction")
def add_transaction(data: TransactionSchema):
    wallet = load_wallet()

    target = None
    for cat in wallet.subcategories:
        if cat.name.lower() == data.category_name.lower():
            target = cat
            break

    if not target:
        raise HTTPException(
            status_code=404,
            detail=f"No existe la categoría '{data.category_name}'. Créala primero."
        )

    tx_date = data.date or datetime.now().strftime("%Y-%m-%d")
    target.add_transaction(Transaction(data.amount, data.description, tx_date))
    save_wallet(wallet)
    return {"message": "Transacción guardada", "total_actual": wallet.get_total()}


@app.put("/api/transaction/{tx_id}")
def update_transaction(tx_id: str, data: TransactionUpdateSchema):
    wallet = load_wallet()
    new_data = {k: v for k, v in data.dict().items() if v is not None}
    if not wallet.edit_transaction(tx_id, new_data):
        raise HTTPException(status_code=404, detail="Transacción no encontrada")
    save_wallet(wallet)
    return {"message": "Transacción actualizada"}


@app.delete("/api/transaction/{tx_id}")
def delete_transaction(tx_id: str):
    wallet = load_wallet()
    if not wallet.delete_transaction(tx_id):
        raise HTTPException(status_code=404, detail="Transacción no encontrada")
    save_wallet(wallet)
    return {"message": "Transacción eliminada"}


@app.get("/api/investments")
def get_investments():
    return load_portfolio().to_dict()


@app.post("/api/investments")
def add_investment(data: InvestmentSchema):
    portfolio = load_portfolio()
    inv_date = data.date or datetime.now().strftime("%Y-%m-%d")
    portfolio.add_investment(Investment(
        data.ticker, data.name, data.type,
        data.quantity, data.purchase_price, inv_date
    ))
    save_portfolio(portfolio)
    return {"message": "Inversión guardada"}


@app.delete("/api/investments/{inv_id}")
def delete_investment(inv_id: str):
    portfolio = load_portfolio()
    if not portfolio.delete_investment(inv_id):
        raise HTTPException(status_code=404, detail="Inversión no encontrada")
    save_portfolio(portfolio)
    return {"message": "Inversión eliminada"}


@app.get("/api/debts")
def get_debts():
    cursor = get_db()["debts"].find({}, {"_id": 0})
    return [Debt.from_dict(d).to_dict() for d in cursor]


@app.post("/api/debts")
def add_debt(data: DebtSchema):
    debt = Debt(
        data.creditor, data.amount, data.currency,
        data.description, data.due_date, data.status,
    )
    get_db()["debts"].insert_one(debt.to_dict())
    return debt.to_dict()


@app.put("/api/debts/{debt_id}")
def update_debt(debt_id: str, data: DebtUpdateSchema):
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Sin cambios para aplicar")
    result = get_db()["debts"].update_one({"id": debt_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Deuda no encontrada")
    return {"message": "Deuda actualizada"}


@app.delete("/api/debts/{debt_id}")
def delete_debt(debt_id: str):
    result = get_db()["debts"].delete_one({"id": debt_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Deuda no encontrada")
    return {"message": "Deuda eliminada"}
