import os
import json
from datetime import datetime
from models import Category, Transaction
from main import get_db, load_wallet, save_wallet

def app():
  print("⏳ Cargando tus datos...")

  my_wallet = load_wallet()
    
  while True:
    print("\n" + "="*30)
    print("1. Agregar nuevo gasto")
    print("2. Agregar nueva categoría")
    print("3. Ver todo el reporte")
    print("4. Buscar un gasto")
    print("5. Administrar categorías (Editar/Eliminar)")
    print("6. Administrar gastos (Editar/Eliminar)")
    print("7. Salir y Guardar")
    print("="*30)
    
    choice = input("Elige una opcion (1/2/3/4/5): ")
      
    if choice == "1":
      if not my_wallet.subcategories:
        print("❌ Primero debes crear al menos una categoría (Opción 2).")
        continue
      amount_str = input("Ingresa el monto: ")
      
      try:
        amount_float = float(amount_str)
      except ValueError:
        print("❌ Error: El monto debe ser un número (ej: 1000 o 1500.50). Operación cancelada.")
        continue
      
      description = input("Ingresa una descripcion: ")
      date = datetime.now().strftime("%Y-%m-%d")

      new_transaction = Transaction(amount_float, description, date)
      
      print("\n📁 ¿En qué categoría quieres guardar este gasto?")
      for index, category in enumerate(my_wallet.subcategories):
        print(f"{index + 1}. {category.name}")
      
      cat_choice_str = input("Elige el número de la categoría: ")
      
      try:
        cat_index = int(cat_choice_str) - 1
      except ValueError:
        print("❌ Error: Debes ingresar un número entero válido. Operación cancelada.")
        continue
      
      if 0 <= cat_index < len(my_wallet.subcategories):
        selected_category = my_wallet.subcategories[cat_index]
        selected_category.add_transaction(new_transaction)
        save_wallet(my_wallet)
        print(f"✅ ¡Gasto agregado con éxito el {date} en '{selected_category.name}'!")
      else:
        print("❌ Número de categoría inválido. El gasto no se guardó.")
          
    elif choice == "2":
      cat_name = input("Ingresa el nombre de la nueva categoría: ")
      
      category_exists = False
      for cat in my_wallet.subcategories:
        if cat.name.lower() == cat_name.lower():
          category_exists = True
          break

      if category_exists:
        print(f"⚠️ La categoría '{cat_name}' ya existe. ¡Puedes usarla directamente en la Opción 1!")
      else:
        new_category = Category(cat_name)
        my_wallet.add_subcategory(new_category)
        save_wallet(my_wallet)
        print(f"✅ ¡Categoría '{cat_name}' creada con éxito!")
        
    elif choice == "3":
      print("\n📊 REPORTE DE GASTOS:")
      my_wallet.display_report()
        
    elif choice == "4":
      keyword = input("Ingresa una palabra clave para buscar: ")
      print("\n🔍 RESULTADOS DE BÚSQUEDA:")
      results = my_wallet.find_transactions(keyword)
      
      if not results:
        print("No se encontraron gastos con esa palabra.")
      else:
        for t in results:
          print(f"  - {t.date} | {t.description}: ${t.amount}")
          
    elif choice == "5":
      if not my_wallet.subcategories:
        print("❌ No hay categorías para administrar.")
        continue
      
      print("\n📁 CATEGORÍAS ACTUALES:")
      for index, category in enumerate(my_wallet.subcategories):
        print(f"{index + 1}. {category.name}")
      
      cat_choice_str = input("Elige el número de la categoría: ")
      
      try:
        cat_index = int(cat_choice_str) - 1
      except ValueError:
        print("❌ Error: Debes ingresar un número entero válido.")
        continue
      
      if 0 <= cat_index < len(my_wallet.subcategories):
        selected_category = my_wallet.subcategories[cat_index]
        print(f"\nSeleccionaste: {selected_category.name}")
        print("1. Editar nombre")
        print("2. Eliminar categoría (¡y todos sus gastos!)")
        action = input("Elige una acción (1/2): ")
        
        if action == "1":
          new_name = input("Ingresa el nuevo nombre: ")
          selected_category.name = new_name
          save_wallet(my_wallet)
          print("✅ Nombre actualizado.")
        elif action == "2":
          my_wallet.subcategories.pop(cat_index)
          save_wallet(my_wallet)
          print("✅ Categoría eliminada.")
        else:
          print("❌ Acción no válida.")
      else:
        print("❌ Número de categoría inválido.")
      
    elif choice == "6":
      if not my_wallet.subcategories:
        print("❌ No hay categorías para buscar gastos.")
        continue
      
      print("\n📁 Elige la categoría del gasto que quieres modificar:")
      for index, category in enumerate(my_wallet.subcategories):
        print(f"{index + 1}. {category.name}")
      
      cat_choice_str = input("Elige el número de la categoría: ")
      
      try:
        cat_index = int(cat_choice_str) - 1
      except ValueError:
        print("❌ Error: Debes ingresar un número entero válido.")
        continue
      
      if 0 <= cat_index < len(my_wallet.subcategories):
        selected_category = my_wallet.subcategories[cat_index]
        
        if not selected_category.transactions:
          print(f"❌ La categoría '{selected_category.name}' no tiene gastos.")
          continue
          
        print(f"\n💸 GASTOS EN {selected_category.name.upper()}:")
        for index, t in enumerate(selected_category.transactions):
          print(f"{index + 1}. {t.date} | {t.description}: ${t.amount}")
          
        exp_choice_str = input("Elige el número del gasto: ")
        
        try:
          exp_index = int(exp_choice_str) - 1
        except ValueError:
          print("❌ Error: Debes ingresar un número entero válido.")
          continue
        
        if 0 <= exp_index < len(selected_category.transactions):
          selected_tx = selected_category.transactions[exp_index]
          print(f"\nSeleccionaste: {selected_tx.description} - ${selected_tx.amount}")
          print("1. Editar gasto")
          print("2. Eliminar gasto")
          action = input("Elige una acción (1/2): ")
          
          if action == "1":
            new_amount_str = input("Ingresa el nuevo monto: ")
            
            try:
              amount_float = float(new_amount_str)
            except ValueError:
              print("❌ Error: El monto debe ser un número. No se guardaron los cambios.")
              continue
            
            new_desc = input("Ingresa la nueva descripción: ")
            selected_tx.amount = float(new_amount_str)
            selected_tx.description = new_desc
            save_wallet(my_wallet)
            print("✅ Gasto actualizado.")
          elif action == "2":
            selected_category.transactions.pop(exp_index)
            save_wallet(my_wallet)
            print("✅ Gasto eliminado.")
          else:
            print("❌ Acción no válida.")
        else:
          print("❌ Número de gasto inválido.")
      else:
        print("❌ Número de categoría inválido.")
        
    elif choice == "7":
      print("💾 Guardando tus datos...")
      save_wallet(my_wallet)
      wallet_dict = my_wallet.to_dict()
      with open("data.json", "w") as file:
        json.dump(wallet_dict, file, indent=2)
      print("¡Nos vemos! Cuidá tu plata 😉")
      break
    else:
      print("❌ Opción no válida, intentá de nuevo.")

if __name__ == "__main__":
  app()