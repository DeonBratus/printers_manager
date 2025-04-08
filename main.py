from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import database
import models
import schemas
from crud import *
from printer_control import *
from reports import *

def init_db():
    models.Base.metadata.create_all(bind=database.engine)

def print_menu():
    print("\n3D Printer Management System")
    print("1. Printer Management")
    print("2. Model Management")
    print("3. Printing Management")
    print("4. Reports")
    print("5. Exit")

def printer_menu():
    print("\nPrinter Management")
    print("1. Add Printer")
    print("2. List Printers")
    print("3. Update Printer")
    print("4. Delete Printer")
    print("5. Back to Main Menu")

def model_menu():
    print("\nModel Management")
    print("1. Add Model")
    print("2. List Models")
    print("3. Update Model")
    print("4. Delete Model")
    print("5. Back to Main Menu")

def printing_menu():
    print("\nPrinting Management")
    print("1. Start New Printing")
    print("2. List Active Printings")
    print("3. Complete Printing")
    print("4. Pause Printing")
    print("5. Resume Printing")
    print("6. Cancel Printing")
    print("7. Back to Main Menu")

def reports_menu():
    print("\nReports")
    print("1. Daily Report")
    print("2. Printer Report")
    print("3. Model Report")
    print("4. Back to Main Menu")

def handle_printer_management(db: Session):
    while True:
        printer_menu()
        choice = input("Enter your choice: ")
        
        if choice == "1":
            name = input("Enter printer name: ")
            printer = schemas.PrinterCreate(name=name)
            created = create_printer(db, printer)
            print(f"Printer created: {created.name}")
            
        elif choice == "2":
            printers = get_printers(db)
            for printer in printers:
                print(f"{printer.id}: {printer.name} - {printer.status} - "
                      f"Total print time: {printer.total_print_time:.2f}h - "
                      f"Total downtime: {printer.total_downtime:.2f}h")
                
        elif choice == "3":
            printer_id = int(input("Enter printer ID to update: "))
            name = input("Enter new name (leave empty to keep current): ")
            printer = get_printer(db, printer_id)
            if printer:
                update_data = {"name": name or printer.name}
                updated = update_printer(db, printer_id, schemas.PrinterCreate(**update_data))
                print(f"Printer updated: {updated.name}")
            else:
                print("Printer not found")
                
        elif choice == "4":
            printer_id = int(input("Enter printer ID to delete: "))
            deleted = delete_printer(db, printer_id)
            if deleted:
                print(f"Printer deleted: {deleted.name}")
            else:
                print("Printer not found")
                
        elif choice == "5":
            break
            
        else:
            print("Invalid choice")

def handle_model_management(db: Session):
    while True:
        model_menu()
        choice = input("Enter your choice: ")
        
        if choice == "1":
            name = input("Enter model name: ")
            printing_time = float(input("Enter estimated printing time (hours): "))
            model = schemas.ModelCreate(name=name, printing_time=printing_time)
            created = create_model(db, model)
            print(f"Model created: {created.name} - {created.printing_time:.2f}h")
            
        elif choice == "2":
            models = get_models(db)
            for model in models:
                print(f"{model.id}: {model.name} - {model.printing_time:.2f}h")
                
        elif choice == "3":
            model_id = int(input("Enter model ID to update: "))
            name = input("Enter new name (leave empty to keep current): ")
            printing_time = input("Enter new printing time (leave empty to keep current): ")
            
            model = get_model(db, model_id)
            if model:
                update_data = {
                    "name": name or model.name,
                    "printing_time": float(printing_time) if printing_time else model.printing_time
                }
                updated = update_model(db, model_id, schemas.ModelCreate(**update_data))
                print(f"Model updated: {updated.name} - {updated.printing_time:.2f}h")
            else:
                print("Model not found")
                
        elif choice == "4":
            model_id = int(input("Enter model ID to delete: "))
            deleted = delete_model(db, model_id)
            if deleted:
                print(f"Model deleted: {deleted.name}")
            else:
                print("Model not found")
                
        elif choice == "5":
            break
            
        else:
            print("Invalid choice")

def handle_printing_management(db: Session):
    while True:
        printing_menu()
        choice = input("Enter your choice: ")
        
        if choice == "1":
            # Start new printing
            printer_id = int(input("Enter printer ID: "))
            model_id = int(input("Enter model ID: "))
            
            printer = get_printer(db, printer_id)
            model = get_model(db, model_id)
            
            if not printer or not model:
                print("Printer or model not found")
                continue
                
            if printer.status != "idle":
                print(f"Printer is currently {printer.status}. Cannot start new printing.")
                continue
                
            printing = schemas.PrintingCreate(
                printer_id=printer_id,
                model_id=model_id,
                printing_time=model.printing_time
            )
            created = create_printing(db, printing)
            print(f"Printing started on {printer.name} with model {model.name}")
            print(f"Estimated completion: {created.calculated_time_stop}")
            
        elif choice == "2":
            # List active printings
            printings = db.query(models.Printing).filter(
                models.Printing.real_time_stop == None
            ).all()
            
            if not printings:
                print("No active printings")
                continue
                
            for printing in printings:
                printer = get_printer(db, printing.printer_id)
                model = get_model(db, printing.model_id)
                print(f"{printing.id}: Printer {printer.name} printing {model.name} - "
                      f"Started: {printing.start_time} - "
                      f"Estimated finish: {printing.calculated_time_stop}")
                      
        elif choice == "3":
            # Complete printing
            printing_id = int(input("Enter printing ID to complete: "))
            completed = complete_printing(db, printing_id)
            if completed:
                print(f"Printing {printing_id} marked as completed")
            else:
                print("Printing not found or already completed")
                
        elif choice == "4":
            # Pause printing
            printing_id = int(input("Enter printing ID to pause: "))
            paused = pause_printing(db, printing_id)
            if paused:
                print(f"Printing {printing_id} paused")
            else:
                print("Printing not found or already completed")
                
        elif choice == "5":
            # Resume printing
            printing_id = int(input("Enter printing ID to resume: "))
            resumed = resume_printing(db, printing_id)
            if resumed:
                print(f"Printing {printing_id} resumed")
            else:
                print("Printing not found or already completed")
                
        elif choice == "6":
            # Cancel printing
            printing_id = int(input("Enter printing ID to cancel: "))
            canceled = cancel_printing(db, printing_id)
            if canceled:
                print(f"Printing {printing_id} canceled")
            else:
                print("Printing not found or already completed")
                
        elif choice == "7":
            break
            
        else:
            print("Invalid choice")

def handle_reports(db: Session):
    while True:
        reports_menu()
        choice = input("Enter your choice: ")
        
        if choice == "1":
            # Daily report
            date_str = input("Enter date (YYYY-MM-DD) or leave empty for today: ")
            date = datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else datetime.now().date()
            
            report = get_daily_report(db, date)
            print(f"\nDaily Report for {date}")
            print(f"Total print jobs: {len(report)}")
            
            total_print_time = sum(
                (p.real_time_stop - p.start_time).total_seconds() / 3600 
                for p in report if p.real_time_stop
            )
            print(f"Total print time: {total_print_time:.2f} hours")
            
            total_downtime = sum(p.downtime for p in report if p.downtime)
            print(f"Total downtime: {total_downtime:.2f} hours")
            
            for p in report:
                printer = get_printer(db, p.printer_id)
                model = get_model(db, p.model_id)
                status = "Completed" if p.real_time_stop else "Active"
                print(f"- {printer.name} printed {model.name} for "
                      f"{(p.real_time_stop - p.start_time).total_seconds() / 3600:.2f}h if p.real_time_stop else 'ongoing' "
                      f"({status})")
                      
        elif choice == "2":
            # Printer report
            printer_id = int(input("Enter printer ID: "))
            report = get_printer_report(db, printer_id)
            
            if not report:
                print("Printer not found")
                continue
                
            print(f"\nPrinter Report for {report['printer'].name}")
            print(f"Total prints: {report['total_prints']}")
            print(f"Successful prints: {report['successful_prints']}")
            print(f"Failed prints: {report['failed_prints']}")
            print(f"Total downtime: {report['total_downtime']:.2f} hours")
            
            print("\nRecent print jobs:")
            for p in report['printings'][-5:]:  # Show last 5 printings
                model = get_model(db, p.model_id)
                status = "Completed" if p.real_time_stop else "Active"
                print(f"- {model.name} started at {p.start_time} ({status})")
                
        elif choice == "3":
            # Model report
            model_id = int(input("Enter model ID: "))
            report = get_model_report(db, model_id)
            
            if not report:
                print("Model not found")
                continue
                
            print(f"\nModel Report for {report['model'].name}")
            print(f"Total prints: {report['total_prints']}")
            print(f"Average print time: {report['average_print_time']:.2f} hours")
            print(f"Success rate: {report['success_rate']:.1f}%")
            
            print("\nRecent print jobs:")
            for p in report['printings'][-5:]:  # Show last 5 printings
                printer = get_printer(db, p.printer_id)
                status = "Completed" if p.real_time_stop else "Active"
                print(f"- Printed on {printer.name} at {p.start_time} ({status})")
                
        elif choice == "4":
            break
            
        else:
            print("Invalid choice")

def main():
    init_db()
    db = next(database.get_db())
    
    while True:
        print_menu()
        choice = input("Enter your choice: ")
        
        if choice == "1":
            handle_printer_management(db)
        elif choice == "2":
            handle_model_management(db)
        elif choice == "3":
            handle_printing_management(db)
        elif choice == "4":
            handle_reports(db)
        elif choice == "5":
            print("Exiting...")
            break
        else:
            print("Invalid choice")

if __name__ == "__main__":
    main()