import uuid
from typing import List, Optional

class Transaction:
    def __init__(self, amount: float, description: str, date: str, id: Optional[str] = None) -> None:
      self.id = id if id else uuid.uuid4().hex
      self.amount = amount
      self.description = description
      self.date = date
    def to_dict(self) -> dict:
      return {
          "id": self.id,
          "amount": self.amount,
          "description": self.description,
          "date": self.date
      }
    @classmethod
    def from_dict(cls, data: dict) -> 'Transaction':
      return cls(data["amount"], data["description"], data["date"], data.get("id"))

class Category:
  def __init__(self, name: str, cat_type: str = "expense")-> None:
    self.name = name
    self.type = cat_type
    self.transactions: list['Transaction'] = []
    self.subcategories: list['Category'] = []
  
  def add_transaction(self, transaction: 'Transaction') -> None:
    self.transactions.append(transaction)
    
  def add_subcategory(self, subcategory: 'Category') -> None:
    self.subcategories.append(subcategory)
    
  def edit_transaction(self, t_id: str, new_data: dict) -> bool:
    for t in self.transactions:
      if t.id == t_id:
        if "amount" in new_data: t.amount = new_data["amount"]
        if "description" in new_data: t.description = new_data["description"]
        if "date" in new_data: t.date = new_data["date"]
        return True
    
    for subcat in self.subcategories:
      if subcat.edit_transaction(t_id, new_data):
        return True
    return False

  def delete_transaction(self, t_id: str) -> bool:
    for i, t in enumerate(self.transactions):
      if t.id == t_id:
        del self.transactions[i]
        return True
    
    for subcat in self.subcategories:
      if subcat.delete_transaction(t_id):
        return True
    return False
    
  def get_total(self) -> float:
    total = 0.0

    for t in self.transactions:
      total += t.amount

    for subcat in self.subcategories:
      total += subcat.get_total()
    return total

  def get_total_expenses(self) -> float:
    total = 0.0
    if self.type == "expense":
      for t in self.transactions:
        total += t.amount
    for subcat in self.subcategories:
      total += subcat.get_total_expenses()
    return total

  def get_total_incomes(self) -> float:
    total = 0.0
    if self.type == "income":
      for t in self.transactions:
        total += t.amount
    for subcat in self.subcategories:
      total += subcat.get_total_incomes()
    return total
  
  def display_report(self, level: int = 0) -> None:
    indent = "    " * level
    print(f"{indent}📂 {self.name}: ${self.get_total()}")
    
    for t in self.transactions:
      print(f"{indent}  💸 {t.date} | {t.description}: {t.amount}")
      
    for subcat in self.subcategories:
      subcat.display_report(level + 1)
      
  def find_transactions(self, keyword: str) -> list['Transaction']:
    results: list['Transaction'] = []
    keyword_lower = keyword.lower()
    
    for t in self.transactions:
      if keyword_lower in t.description.lower():
        results.append(t)
        
    for subcat in self.subcategories:
      result_son = subcat.find_transactions(keyword)
      results.extend(result_son)
      
    return results

  def filter_by_month(self, month: str) -> 'Category':
    filtered_cat = Category(self.name, self.type)
    
    for t in self.transactions:
      if t.date.startswith(month):
        filtered_cat.add_transaction(t)
        
    for subcat in self.subcategories:
      filtered_subcat = subcat.filter_by_month(month)
      filtered_cat.add_subcategory(filtered_subcat)
      
    return filtered_cat
  
  def to_dict(self) -> dict:
    trans_dicts = []
    subcat_dicts = []

    for t in self.transactions: 
      trans_dicts.append(t.to_dict())

    for subcat in self.subcategories:
      subcat_dicts.append(subcat.to_dict())
        
    return {
        "name": self.name,
        "type": self.type,
        "transactions": trans_dicts,
        "subcategories": subcat_dicts
    }
  @classmethod
  def from_dict(cls, data: dict) -> 'Category':
    category = cls(data["name"], data.get("type", "expense"))
    
    for t_data in data["transactions"]:
        transaction_obj = Transaction.from_dict(t_data)
        category.add_transaction(transaction_obj)
        
    for subcat_data in data["subcategories"]:
        subcat_obj = Category.from_dict(subcat_data)
        category.add_subcategory(subcat_obj)
        
    return category

class Investment:
    def __init__(self, ticker: str, name: str, inv_type: str, quantity: float, purchase_price: float, date: str, id: Optional[str] = None) -> None:
        self.id = id if id else uuid.uuid4().hex
        self.ticker = ticker
        self.name = name
        self.type = inv_type
        self.quantity = quantity
        self.purchase_price = purchase_price
        self.date = date

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "ticker": self.ticker,
            "name": self.name,
            "type": self.type,
            "quantity": self.quantity,
            "purchase_price": self.purchase_price,
            "date": self.date
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'Investment':
        return cls(
            data["ticker"], data["name"], data["type"], 
            data["quantity"], data["purchase_price"], data["date"], data.get("id")
        )

class Debt:
    def __init__(self, creditor: str, amount: float, currency: str, description: str = "", due_date: Optional[str] = None, status: str = "pending", id: Optional[str] = None) -> None:
        self.id = id if id else uuid.uuid4().hex
        self.creditor = creditor
        self.amount = amount
        self.currency = currency
        self.description = description
        self.due_date = due_date
        self.status = status

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "creditor": self.creditor,
            "amount": self.amount,
            "currency": self.currency,
            "description": self.description,
            "due_date": self.due_date,
            "status": self.status,
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'Debt':
        return cls(
            data["creditor"], data["amount"], data.get("currency", "ARS"),
            data.get("description", ""), data.get("due_date"), data.get("status", "pending"), data.get("id")
        )


class Portfolio:
    def __init__(self):
        self.investments: list['Investment'] = []

    def add_investment(self, inv: 'Investment'):
        self.investments.append(inv)
        
    def edit_investment(self, inv_id: str, new_data: dict) -> bool:
        for inv in self.investments:
            if inv.id == inv_id:
                if "ticker" in new_data: inv.ticker = new_data["ticker"]
                if "name" in new_data: inv.name = new_data["name"]
                if "type" in new_data: inv.type = new_data["type"]
                if "quantity" in new_data: inv.quantity = new_data["quantity"]
                if "purchase_price" in new_data: inv.purchase_price = new_data["purchase_price"]
                if "date" in new_data: inv.date = new_data["date"]
                return True
        return False
        
    def delete_investment(self, inv_id: str) -> bool:
        for i, inv in enumerate(self.investments):
            if inv.id == inv_id:
                del self.investments[i]
                return True
        return False

    def to_dict(self) -> dict:
        return {
            "investments": [inv.to_dict() for inv in self.investments]
        }
        
    @classmethod
    def from_dict(cls, data: dict) -> 'Portfolio':
        portfolio = cls()
        for inv_data in data.get("investments", []):
            portfolio.add_investment(Investment.from_dict(inv_data))
        return portfolio
