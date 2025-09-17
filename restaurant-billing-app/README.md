# Restaurant Billing Application

This is a restaurant billing application built using the PERN stack (PostgreSQL, Express, React, Node.js). The application allows users to manage billing records efficiently.

## Project Structure

```
backend
├── src
│   ├── app.js                     # Main entry point for the backend server
│   ├── db
│   │   └── index.js               # PostgreSQL database connection setup
│   ├── models
│   │   ├── billingModel.js        # Handles database queries for bills
│   │   ├── userModel.js           # Handles database queries for users
│   │   ├── shiftModel.js          # Handles database queries for shifts
│   │   ├── itemModel.js           # Handles database queries for items
│   │   ├── pricingModel.js        # Handles database queries for item pricing
│   │   ├── transactionModel.js    # Handles database queries for transactions
│   │   └── invoiceModel.js        # Handles database queries for invoices
│   ├── controllers
│   │   ├── billingController.js   # Handles business logic for bills
│   │   ├── userController.js      # Handles business logic for users
│   │   ├── shiftController.js     # Handles business logic for shifts
│   │   ├── itemController.js      # Handles business logic for items
│   │   ├── transactionController.js # Handles business logic for transactions
│   │   └── invoiceController.js   # Handles business logic for invoices
│   ├── routes
│   │   ├── billingRoutes.js       # Routes for billing-related endpoints
│   │   ├── userRoutes.js          # Routes for user-related endpoints
│   │   ├── shiftRoutes.js         # Routes for shift-related endpoints
│   │   ├── itemRoutes.js          # Routes for item-related endpoints
│   │   ├── transactionRoutes.js   # Routes for transaction-related endpoints
│   │   └── invoiceRoutes.js       # Routes for invoice-related endpoints
├── .env                           # Environment variables (e.g., DB credentials)
├── package.json                   # Backend dependencies and scripts
├── package-lock.json              # Lock file for dependencies
```

## Getting Started

### Prerequisites

- Node.js
- PostgreSQL
- Docker (optional, for containerization)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd restaurant-billing-app
   ```

2. Set up the backend:
   - Navigate to the `backend` directory:
     ```
     cd backend
     ```
   - Install dependencies:
     ```
     npm install
     ```
   - Create a `.env` file in the `backend` directory and add your environment variables (e.g., database connection string).

3. Set up the frontend:
   - Navigate to the `frontend` directory:
     ```
     cd ../frontend
     ```
   - Install dependencies:
     ```
     npm install
     ```
   - Create a `.env` file in the `frontend` directory and add your API base URL.

### Running the Application

- To run the backend:
  ```
  cd backend
  npm start
  ```

- To run the frontend:
  ```
  cd frontend
  npm start
  ```

### Docker

To run the application using Docker, you can use the provided `docker-compose.yml` file. Run the following command in the root directory of the project:

```
docker-compose up
```

### Usage

- The application allows you to create, view, and delete billing records.
- Access the frontend application in your browser at `http://localhost:3000`.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or features.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
