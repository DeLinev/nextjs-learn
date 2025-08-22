'use server'

import postgres from "postgres";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "next/navigation";
import { User } from "./definitions";
import { fetchUser } from "./data";
import bcrypt from 'bcrypt';
import { createSession, deleteSession } from "./session";
import { email } from "zod/v4";
import { errors } from "jose";
import { v4 as uuidv4 } from "uuid";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({ invalid_type_error: 'Please select a customer.' }),
    amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'], {invalid_type_error: 'Please select an invoice status.'}),
    date: z.string()
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    },
    message?: string | null;
}

export async function createInvoice(prevState: State, formData: FormData) {
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    console.log(validatedFields);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.'
        };
    }

    const { customerId, amount, status } = validatedFields.data;

    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];
    
    try {
        await sql`
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
    } catch (error) {
        return {
            message: 'Database Error: Failed to create invoice.'
        }
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

const UpdateInvoice = FormSchema.omit({id: true, date: true});

export async function updateInvoice(id: string, prevState: State, formData: FormData) {
    const validatedFields = UpdateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.'
        }
    }

    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;

    try {
    await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
    `
    } catch (error) {
        return {
            message: 'Database Error: Failed to create invoice.'
        }
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    await sql`
        DELETE FROM invoices
        WHERE id = ${id}
    `

    revalidatePath('/dashboard/invoices');
}

export type SignInState = {
    errors?: {
        email?: string[];
        password?: string[];
    },
    message?: string | null;
}

const signInSchema = z.object({
    email: z.string().email({ message: 'Invalid email address.' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters long.' }),
});

export async function signIn(prevState: SignInState, formData: FormData) {
    const validatedFields = signInSchema.safeParse(Object.fromEntries(formData));

    if (!validatedFields.success) {
        console.log("Sign in error: Validation failed");
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing fields. Failed to sign in."
        }
    }
    console.log(validatedFields.data);

    const { email, password } = validatedFields.data;

    try {
        const user = await fetchUser(email);
        if (!user) {
            return { message: 'Invalid email or password.'}
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return { message: 'Invalid email or password.'}
        }

        await createSession(user.id);
    } catch (error) {
        return { message: 'Invalid email or password.'}
    }

    redirect("/dashboard");
}

export async function signOut() {
    await deleteSession();
    redirect("/");
}

export type SignUpState = {
    errors?: {
        email?: string[];
        password?: string[];
        name?: string[];
    },
    message?: string | null;
}

const signUpSchema = z.object({
    email: z.string().email({message: "Invalid email address."}),
    password: z.string().min(6, { message: "Password must be at least 6 characters long."}),
    name: z.string().regex(/^[A-Za-z]{4,}$/, { message: "Name must contain only Latin letters and be at least 4 characters long." })
})

export async function signUp(prevState: SignUpState, formData: FormData) {
    const validatedFields = signUpSchema.safeParse(Object.fromEntries(formData));

    if (!validatedFields.success) {
        console.log("Failed to sign up.");
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing fields. Failed to sign up."
        }
    }

    const { email, password, name } = validatedFields.data;

    try {
        const user = await fetchUser(email);
        if (user) {
            return { message: "User with this email already exists."}
        }
        
        const newId = uuidv4(); 
        const hashedPassword = await bcrypt.hash(password, 10);
        await sql`
            INSERT INTO users (id, name, email, password)
            VALUES (${newId}, ${name}, ${email}, ${hashedPassword})
            ON CONFLICT (id) DO NOTHING;
        `

        await createSession(newId);
    } catch (error) {
        return { message: 'Invalid email, password or username.'}
    }

    redirect("/dashboard");
}