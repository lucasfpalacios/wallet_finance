from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from models import Category, Transaction
import json
import os
from datetime import datetime

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

class TransactionSchema(BaseModel):
  amount: float
  description: str
  category_name: str

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
def get_report():
  """Devuelve toda la estructura de la billetera en formato JSON"""
  my_wallet = load_wallet()
  return my_wallet.to_dict()

@app.post("/api/category")
def add_category(data: CategorySchema):
  """Crea una nueva categoría principal evitando duplicados"""
  my_wallet = load_wallet()
  
  for cat in my_wallet.subcategories:
    if cat.name.lower() == data.name.lower():
      raise HTTPException(status_code=400, detail="La categoría ya existe")
  
  new_cat = Category(data.name)
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

  current_date = datetime.now().strftime("%Y-%m-%d")
  new_t = Transaction(data.amount, data.description, current_date)
  target_category.add_transaction(new_t)
  
  save_wallet(my_wallet)
  return {"message": "Gasto guardado con éxito", "total_actual": my_wallet.get_total()}