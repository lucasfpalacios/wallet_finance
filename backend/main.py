from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from models import Category, Transaction, Investment, Portfolio
import json
import os
from datetime import datetime

class InvestmentSchema(BaseModel):
    ticker: str
    name: str
    type: str
    quantity: float
    purchase_price: float
    date: Optional[str] = None

class InvestmentEditSchema(BaseModel):
    ticker: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    quantity: Optional[float] = None
    purchase_price: Optional[float] = None
    date: Optional[str] = None

class DebtSchema(BaseModel):
    amount: float
    currency: str
    creditor: str
    description: Optional[str] = ""
    due_date: Optional[str] = None
    status: Optional[str] = "pending"

class DebtEditSchema(BaseModel):
    amount: Optional[float] = None
    currency: Optional[str] = None
    creditor: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None

def load_debts():
    if os.path.exists("debts.json"):
        with open("debts.json", "r") as file:
            try:
                return json.load(file)
            except:
                pass
    return []

def save_debts(debts):
    with open("debts.json", "w") as file:
        json.dump(debts, file, indent=2)

def load_portfolio():
    if os.path.exists("investments.json"):
        with open("investments.json", "r") as file:
            try:
                data = json.load(file)
                return Portfolio.from_dict(data)
            except:
                pass
    return Portfolio()

def save_portfolio(portfolio: Portfolio):
    with open("investments.json", "w") as file:
        json.dump(portfolio.to_dict(), file, indent=2)

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
  type: Optional[str] = "expense"

class TransactionSchema(BaseModel):
  amount: float
  description: str
  category_name: str
  date: Optional[str] = None

class TransactionEditSchema(BaseModel):
  amount: Optional[float] = None
  description: Optional[str] = None
  date: Optional[str] = None

# --- FUNCIONES AUXILIARES DE PERSISTENCIA ---

def load_wallet():
  if os.path.exists("data.json"):
    with open("data.json", "r") as file:
      wallet_dict = json.load(file)
      return Category.from_dict(wallet_dict)
  return Category("Mis Finanzas")

def save_wallet(wallet: Category):
  with open("data.json", "w") as file:
    json.dump(wallet.to_dict(), file, indent=2)
    

@app.get("/api/report")
def get_report(month: Optional[str] = None):
  """Devuelve toda la estructura de la billetera en formato JSON, opcionalmente filtrada por mes"""
  my_wallet = load_wallet()
  if month:
    return my_wallet.filter_by_month(month).to_dict()
  return my_wallet.to_dict()

@app.post("/api/category")
def add_category(data: CategorySchema):
  """Crea una nueva categoría principal evitando duplicados"""
  my_wallet = load_wallet()
  
  for cat in my_wallet.subcategories:
    if cat.name.lower() == data.name.lower():
      raise HTTPException(status_code=400, detail="La categoría ya existe")
  
  new_cat = Category(data.name, data.type)
  my_wallet.add_subcategory(new_cat)
  save_wallet(my_wallet)
  return {"message": f"Categoría '{data.name}' creada con éxito"}

@app.post("/api/transaction")
def add_transaction(data: TransactionSchema):
  """Agrega un nuevo gasto dentro de una categoría existente"""
  my_wallet = load_wallet()
  
  target_category = None
  for cat in my_wallet.subcategories:
    if cat.name.lower() == data.category_name.lower():
      target_category = cat
      break
  
  if not target_category:
    raise HTTPException(
      status_code=404, 
      detail=f"No existe la categoría '{data.category_name}'. Créala primero."
    )

  current_date = data.date if data.date else datetime.now().strftime("%Y-%m-%d")
  new_t = Transaction(data.amount, data.description, current_date)
  target_category.add_transaction(new_t)
  
  save_wallet(my_wallet)
  return {"message": "Gasto guardado con éxito", "total_actual": my_wallet.get_total()}

@app.put("/api/transaction/{t_id}")
def edit_transaction(t_id: str, data: TransactionEditSchema):
  my_wallet = load_wallet()
  update_data = {k: v for k, v in data.model_dump().items() if v is not None}
  
  if my_wallet.edit_transaction(t_id, update_data):
    save_wallet(my_wallet)
    return {"message": "Gasto actualizado"}
  
  raise HTTPException(status_code=404, detail="Gasto no encontrado")

@app.delete("/api/transaction/{t_id}")
def delete_transaction(t_id: str):
  my_wallet = load_wallet()
  if my_wallet.delete_transaction(t_id):
    save_wallet(my_wallet)
    return {"message": "Gasto eliminado"}
  
  raise HTTPException(status_code=404, detail="Gasto no encontrado")

@app.get("/api/investments")
def get_investments():
    portfolio = load_portfolio()
    return portfolio.to_dict()

@app.post("/api/investments")
def add_investment(data: InvestmentSchema):
    portfolio = load_portfolio()
    current_date = data.date if data.date else datetime.now().strftime("%Y-%m-%d")
    new_inv = Investment(data.ticker, data.name, data.type, data.quantity, data.purchase_price, current_date)
    portfolio.add_investment(new_inv)
    save_portfolio(portfolio)
    return {"message": "Inversión agregada con éxito"}

@app.put("/api/investments/{inv_id}")
def edit_investment(inv_id: str, data: InvestmentEditSchema):
    portfolio = load_portfolio()
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if portfolio.edit_investment(inv_id, update_data):
        save_portfolio(portfolio)
        return {"message": "Inversión actualizada"}
    
    raise HTTPException(status_code=404, detail="Inversión no encontrada")

@app.delete("/api/investments/{inv_id}")
def delete_investment(inv_id: str):
    portfolio = load_portfolio()
    if portfolio.delete_investment(inv_id):
        save_portfolio(portfolio)
        return {"message": "Inversión eliminada"}
    
    raise HTTPException(status_code=404, detail="Inversión no encontrada")

@app.get("/api/debts")
def get_debts():
    return load_debts()

@app.post("/api/debts")
def add_debt(data: DebtSchema):
    import uuid
    debts = load_debts()
    new_debt = {
        "id": uuid.uuid4().hex,
        "amount": data.amount,
        "currency": data.currency,
        "creditor": data.creditor,
        "description": data.description,
        "due_date": data.due_date,
        "status": data.status
    }
    debts.append(new_debt)
    save_debts(debts)
    return {"message": "Deuda agregada con éxito", "debt": new_debt}

@app.put("/api/debts/{debt_id}")
def edit_debt(debt_id: str, data: DebtEditSchema):
    debts = load_debts()
    for debt in debts:
        if debt["id"] == debt_id:
            if data.amount is not None: debt["amount"] = data.amount
            if data.currency is not None: debt["currency"] = data.currency
            if data.creditor is not None: debt["creditor"] = data.creditor
            if data.description is not None: debt["description"] = data.description
            if data.due_date is not None: debt["due_date"] = data.due_date
            if data.status is not None: debt["status"] = data.status
            save_debts(debts)
            return {"message": "Deuda actualizada", "debt": debt}
    raise HTTPException(status_code=404, detail="Deuda no encontrada")

@app.delete("/api/debts/{debt_id}")
def delete_debt(debt_id: str):
    debts = load_debts()
    updated_debts = [d for d in debts if d["id"] != debt_id]
    if len(updated_debts) == len(debts):
        raise HTTPException(status_code=404, detail="Deuda no encontrada")
    save_debts(updated_debts)
    return {"message": "Deuda eliminada"}