import { Address } from "viem";
import { SimpleLendingAction } from "../actions/simpleLending";
import { elizaLogger } from "@elizaos/core";

export class LendingHandler {
    constructor(private lendingAction: SimpleLendingAction) {}

    async handleMessage(message: string, sender: Address): Promise<string> {
        try {
            const command = message.toLowerCase().trim();

            // Create loan command
            if (command.startsWith("create loan")) {
                const parts = command.split(" ");
                if (parts.length !== 4) {
                    return "Invalid format. Use: create loan <collateral_amount> <loan_amount>";
                }

                const collateralAmount = parts[2];
                const loanAmount = parts[3];

                const loan = await this.lendingAction.createLoan(
                    sender,
                    collateralAmount,
                    loanAmount
                );

                return `Loan created successfully!\nCollateral: ${collateralAmount} tokens\nLoan amount: ${loanAmount} tokens\nDuration: 30 days`;
            }

            // Repay loan command
            if (command.startsWith("repay loan")) {
                const parts = command.split(" ");
                if (parts.length !== 3) {
                    return "Invalid format. Use: repay loan <loan_index>";
                }

                const loanIndex = parseInt(parts[2]);
                if (isNaN(loanIndex)) {
                    return "Invalid loan index";
                }

                const loan = await this.lendingAction.repayLoan(sender, loanIndex);
                return `Loan repaid successfully!\nAmount: ${loan.loanAmount} tokens`;
            }

            // Get loan details command
            if (command.startsWith("loan details")) {
                const parts = command.split(" ");
                if (parts.length !== 3) {
                    return "Invalid format. Use: loan details <loan_index>";
                }

                const loanIndex = parseInt(parts[2]);
                if (isNaN(loanIndex)) {
                    return "Invalid loan index";
                }

                const loan = await this.lendingAction.getLoanDetails(sender, loanIndex);
                if (!loan) {
                    return "Loan not found";
                }

                return `Loan Details:\nBorrower: ${loan.borrower}\nCollateral: ${loan.collateralAmount} tokens\nLoan amount: ${loan.loanAmount} tokens\nStart time: ${new Date(Number(loan.startTime) * 1000).toLocaleString()}\nEnd time: ${new Date(Number(loan.endTime) * 1000).toLocaleString()}\nStatus: ${loan.isActive ? "Active" : "Repaid"}`;
            }

            // Get active loans command
            if (command === "active loans") {
                const loans = await this.lendingAction.getActiveLoans(sender);
                if (loans.length === 0) {
                    return "No active loans found";
                }

                return loans.map((loan, index) => 
                    `Loan ${index}:\nAmount: ${loan.loanAmount} tokens\nCollateral: ${loan.collateralAmount} tokens\nEnd time: ${new Date(Number(loan.endTime) * 1000).toLocaleString()}`
                ).join("\n\n");
            }

            // Get total borrowed command
            if (command === "total borrowed") {
                const total = await this.lendingAction.getTotalBorrowed(sender);
                return `Total borrowed: ${total} tokens`;
            }

            // Help command
            if (command === "help" || command === "lending help") {
                return `Available lending commands:
1. create loan <collateral_amount> <loan_amount> - Create a new loan
2. repay loan <loan_index> - Repay an existing loan
3. loan details <loan_index> - Get details of a specific loan
4. active loans - List all your active loans
5. total borrowed - Get your total borrowed amount

Requirements:
- Minimum collateral: 100 tokens
- Maximum loan: 10,000 tokens
- Collateral ratio: 150%
- Loan duration: 30 days`;
            }

            return "Unknown command. Type 'lending help' for available commands.";
        } catch (error) {
            elizaLogger.error("Error handling lending message:", error);
            return `Error: ${error.message}`;
        }
    }
} 