import { Address, parseUnits, formatUnits } from "viem";
import { WalletProvider } from "../providers/wallet";
import { elizaLogger } from "@elizaos/core";
import { Entity, Column, PrimaryGeneratedColumn, Repository } from "typeorm";

export interface Loan {
    borrower: Address;
    collateralAmount: bigint;
    loanAmount: bigint;
    startTime: bigint;
    endTime: bigint;
    isActive: boolean;
}

@Entity()
export class LoanEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    borrower: string;

    @Column("bigint")
    collateralAmount: string;

    @Column("bigint")
    loanAmount: string;

    @Column("bigint")
    startTime: string;

    @Column("bigint")
    endTime: string;

    @Column()
    isActive: boolean;
}

export class SimpleLendingAction {
    private readonly COLLATERAL_RATIO = 120; // 120% collateral ratio (1.2x)
    private readonly LOAN_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
    private readonly MIN_COLLATERAL = parseUnits("100", 18); // minimum collateral amount, but we need specify tokens
    private readonly MAX_LOAN = parseUnits("10000", 18); // maximum loan of XY 

    constructor(
        private walletProvider: WalletProvider,
        private loanRepository: Repository<LoanEntity>
    ) {}

    async createLoan(
        borrower: Address,
        collateralAmount: string,
        loanAmount: string
    ): Promise<Loan> {
        try {
            const parsedCollateral = parseUnits(collateralAmount, 18);
            const parsedLoan = parseUnits(loanAmount, 18);

            // Validate loan parameters
            if (parsedCollateral < this.MIN_COLLATERAL) {
                throw new Error("Collateral amount too small");
            }
            if (parsedLoan > this.MAX_LOAN) {
                throw new Error("Loan amount too large");
            }

            // Check if collateral ratio is sufficient (150%)
            const requiredCollateral = (parsedLoan * BigInt(this.COLLATERAL_RATIO)) / BigInt(100);
            if (parsedCollateral < requiredCollateral) {
                throw new Error("Insufficient collateral ratio");
            }

            const loanEntity = this.loanRepository.create({
                borrower,
                collateralAmount: parsedCollateral.toString(),
                loanAmount: parsedLoan.toString(),
                startTime: BigInt(Math.floor(Date.now() / 1000)).toString(),
                endTime: BigInt(Math.floor(Date.now() / 1000) + this.LOAN_DURATION).toString(),
                isActive: true
            });

            await this.loanRepository.save(loanEntity);

            const loan: Loan = {
                borrower,
                collateralAmount: parsedCollateral,
                loanAmount: parsedLoan,
                startTime: BigInt(Math.floor(Date.now() / 1000)),
                endTime: BigInt(Math.floor(Date.now() / 1000) + this.LOAN_DURATION),
                isActive: true
            };

            elizaLogger.info(`Created loan for ${borrower}: ${formatUnits(parsedLoan, 18)} tokens`);
            return loan;
        } catch (error) {
            elizaLogger.error("Error creating loan:", error);
            throw error;
        }
    }

    async repayLoan(borrower: Address, loanIndex: number): Promise<Loan> {
        try {
            const borrowerLoans = await this.loanRepository.find({ where: { borrower } });
            if (!borrowerLoans || loanIndex >= borrowerLoans.length) {
                throw new Error("Invalid loan index");
            }

            const loan = borrowerLoans[loanIndex];
            if (!loan.isActive) {
                throw new Error("Loan is not active");
            }

            if (BigInt(Math.floor(Date.now() / 1000)) > BigInt(loan.endTime)) {
                throw new Error("Loan has expired");
            }

            loan.isActive = false;
            await this.loanRepository.update(loan.id, loan);

            elizaLogger.info(`Loan repaid by ${borrower}: ${formatUnits(BigInt(loan.loanAmount), 18)} tokens`);
            return loan;
        } catch (error) {
            elizaLogger.error("Error repaying loan:", error);
            throw error;
        }
    }

    async getLoanDetails(borrower: Address, loanIndex: number): Promise<Loan | null> {
        try {
            const borrowerLoans = await this.loanRepository.find({ where: { borrower } });
            if (!borrowerLoans || loanIndex >= borrowerLoans.length) {
                return null;
            }
            return borrowerLoans[loanIndex];
        } catch (error) {
            elizaLogger.error("Error getting loan details:", error);
            throw error;
        }
    }

    async getActiveLoans(borrower: Address): Promise<Loan[]> {
        try {
            const borrowerLoans = await this.loanRepository.find({ where: { borrower } });
            return borrowerLoans.filter(loan => loan.isActive);
        } catch (error) {
            elizaLogger.error("Error getting active loans:", error);
            throw error;
        }
    }

    async getTotalBorrowed(borrower: Address): Promise<string> {
        try {
            const borrowerLoans = await this.loanRepository.find({ where: { borrower } });
            const total = borrowerLoans.reduce((acc, loan) => acc + BigInt(loan.loanAmount), BigInt(0));
            return formatUnits(total, 18);
        } catch (error) {
            elizaLogger.error("Error getting total borrowed:", error);
            throw error;
        }
    }

    async getTotalLent(): Promise<string> {
        try {
            let total = BigInt(0);
            const loans = await this.loanRepository.find();
            for (const loan of loans) {
                total += BigInt(loan.loanAmount);
            }
            return formatUnits(total, 18);
        } catch (error) {
            elizaLogger.error("Error getting total lent:", error);
            throw error;
        }
    }
} 