class Transaction:
    def __init__(self, amount: float, description: str, date: str) -> None:
      self.amount = amount
      self.description = description
      self.date = date
    def to_dict(self) -> dict:
      return {
          "amount": self.amount,
          "description": self.description,
          "date": self.date
      }
    @classmethod
    def from_dict(cls, data: dict) -> 'Transaction':
      return cls(data["amount"], data["description"], data["date"])

class Category:
  def __init__(self, name: str)-> None:
    self.name = name
    self.transactions: list['Transaction'] = []
    self.subcategories: list['Category'] = []
  
  def add_transaction(self, transaction: 'Transaction') -> None:
    self.transactions.append(transaction)
    
  def add_subcategory(self, subcategory: 'Category') -> None:
    self.subcategories.append(subcategory)
    
  def get_total(self) -> float:
    total = 0.0

    for t in self.transactions:
      total += t.amount

    for subcat in self.subcategories:
      total += subcat.get_total()
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
  
  def to_dict(self) -> dict:
    trans_dicts = []
    subcat_dicts = []

    for t in self.transactions: 
      trans_dicts.append(t.to_dict())

    for subcat in self.subcategories:
      subcat_dicts.append(subcat.to_dict())
        
    return {
        "name": self.name,
        "transactions": trans_dicts,
        "subcategories": subcat_dicts
    }
  @classmethod
  def from_dict(cls, data: dict) -> 'Category':
    category = cls(data["name"])
    
    for t_data in data["transactions"]:
        transaction_obj = Transaction.from_dict(t_data)
        category.add_transaction(transaction_obj)
        
    for subcat_data in data["subcategories"]:
        subcat_obj = Category.from_dict(subcat_data)
        category.add_subcategory(subcat_obj)
        
    return category
