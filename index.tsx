/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const editIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-4-4zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/></svg>`;
const deleteIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1-1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 1 1 0v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/></svg>`;

// ===== Firebase Integration =====

// Declare global variables from CDN scripts
declare var firebase: any;
declare var QRCodeStyling: any;

// PENTING: Gantikan objek di bawah dengan konfigurasi Firebase anda sendiri
const firebaseConfig = {
  apiKey: "AIzaSyBTb9NQCJL2RzcKUeGyRenZsS9s75gO2xQ",
  authDomain: "qnmic-6c6ef.firebaseapp.com",
  projectId: "qnmic-6c6ef",
  storageBucket: "qnmic-6c6ef.firebasestorage.app",
  messagingSenderId: "848267325154",
  appId: "1:848267325154:web:58e30154a13c4a2619b8bb"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// ===== Admin Email Whitelist (kecualikan daripada semakan allowlist) =====
const ADMIN_EMAILS = ['m.nizar@umt.edu.my'];
const isAdminEmail = (email?: string | null) =>
  !!email && ADMIN_EMAILS.includes(email.toLowerCase());

// ===== Types =====
interface QREntry {
    id: string;
    name: string;
    targetUrl: string;
    ownerId?: string;
    createdAt?: any;
}

const QR_CAPACITIES = {
    L: [17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 321, 367, 425, 458, 520, 586, 644, 718, 792, 858, 929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732, 1840, 1952, 2068, 2188, 2303, 2431, 2563, 2699, 2809, 2953],
    M: [14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450, 504, 560, 624, 666, 711, 779, 857, 911, 997, 1059, 1125, 1208, 1268, 1368, 1452, 1540, 1632, 1728, 1813, 1911, 1987, 2099, 2215, 2335],
    Q: [11, 20, 32, 46, 60, 74, 86, 108, 130, 151, 177, 203, 241, 258, 292, 322, 364, 394, 442, 482, 509, 565, 611, 661, 715, 751, 805, 868, 908, 988, 1032, 1112, 1168, 1228, 1283, 1351, 1423, 1499, 1579, 1663],
    H: [7, 14, 24, 34, 44, 58, 66, 84, 100, 118, 138, 158, 180, 197, 224, 250, 280, 310, 338, 382, 403, 439, 463, 511, 535, 583, 625, 658, 698, 742, 782, 826, 874, 908, 963, 1021, 1053, 1117, 1185, 1257]
};

interface QrMetadata {
    chosen_version: number;
    module_count: number;
    ecc: 'L' | 'M' | 'Q' | 'H';
    byte_len: number;
    module_size_px: number;
    final_width_px: number;
    warning?: string;
}

function calculateQrMetadata(data: string, ecc: 'L' | 'M' | 'Q' | 'H'): QrMetadata | null {
    if (!data) return null;
    try {
        const byte_len = new Blob([data]).size;
        const capacityList = QR_CAPACITIES[ecc];
        let chosen_version = -1;
        for (let i = 0; i < capacityList.length; i++) {
            if (capacityList[i] >= byte_len) {
                chosen_version = i + 1;
                break;
            }
        }
        if (chosen_version === -1) {
            return {
                warning: "URL terlalu panjang untuk dijana sebagai Kod QR. Sila gunakan pemendek URL seperti bit.ly untuk memendekkan pautan anda.",
                byte_len,
                ecc,
                chosen_version: 0, module_count: 0, module_size_px: 0, final_width_px: 0,
            };
        }
        const module_count = 21 + 4 * (chosen_version - 1);
        let target_width_px = 1024;
        let module_size_px = Math.floor(target_width_px / (module_count + 8));
        if (module_size_px < 3) module_size_px = 3;
        const final_width_px = (module_count + 8) * module_size_px;
        let warning;
        if (chosen_version > 32) {
             warning = "URL sangat panjang. Pertimbangkan untuk memendekkannya untuk kebolehimbasan yang lebih baik.";
        }
        return {
            chosen_version,
            module_count,
            ecc,
            byte_len,
            module_size_px,
            final_width_px,
            warning,
        };
    } catch (e) {
        console.error("Error calculating QR metadata:", e);
        return null;
    }
}

// ===== Helper Functions =====
function mapAuthCodeToMessage(code: string): string {
    switch (code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return 'E-mel atau kata laluan tidak sah.';
        case 'auth/email-already-in-use':
            return 'E-mel ini telah didaftarkan.';
        case 'auth/weak-password':
            return 'Kata laluan terlalu lemah. Sila gunakan sekurang-kurangnya 6 aksara.';
        case 'auth/invalid-email':
            return 'Format e-mel tidak sah.';
        default:
            return 'Berlaku ralat semasa pengesahan. Sila cuba lagi.';
    }
}

function formatFirestoreTimestamp(timestamp: any): string {
    if (!timestamp || typeof timestamp.toDate !== 'function') return '';
    try {
        const date = timestamp.toDate();
        const options: Intl.DateTimeFormatOptions = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        };
        return new Intl.DateTimeFormat('en-GB', options).format(date).replace(',', '');
    } catch (error) {
        console.error("Error formatting timestamp:", error);
        return '';
    }
}

// ===== Components =====
function AuthPage() {
    const [isLogin, setIsLogin] = React.useState(true);
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Sila masukkan e-mel dan kata laluan.");
            return;
        }
        if (!isLogin && password !== confirmPassword) {
            setError("Kata laluan dan pengesahan kata laluan tidak sepadan.");
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            const emailToCheck = email.trim().toLowerCase();

            // ===== FIX: KECUALIKAN AKAUN ADMIN DARIPADA ALLOWLIST =====
            if (!isAdminEmail(emailToCheck)) {
                try {
                    const allowedEmailDoc = await db.collection('allowedEmails').doc(emailToCheck).get();
                    if (!allowedEmailDoc.exists) {
                        if (isLogin) {
                            setError("Akaun anda telah disekat. Sila hubungi pentadbir.");
                        } else {
                            setError("E-mel ini tidak dibenarkan untuk mendaftar. Sila hubungi pentadbir.");
                        }
                        return; // Early exit
                    }
                } catch (err: any) {
                    console.error("Error checking email allowlist:", err);
                    if (err.code === 'permission-denied') {
                        setError("Ralat konfigurasi: Tidak dapat mengesahkan e-mel. Semak Peraturan Keselamatan (Security Rules) pangkalan data anda.");
                    } else {
                        setError("Ralat pangkalan data semasa menyemak e-mel. Sila cuba sebentar lagi.");
                    }
                    return; // Early exit
                }
            }

            // Jika semakan melepasi, teruskan auth
            if (isLogin) {
                await auth.signInWithEmailAndPassword(email, password);
            } else {
                await auth.createUserWithEmailAndPassword(email, password);
            }
        } catch (err: any) {
            setError(mapAuthCodeToMessage(err.code || ''));
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError(null);
        setPassword('');
        setConfirmPassword('');
    };

    return React.createElement('div', { className: 'auth-container' },
        React.createElement('h1', {}, ['Penjana', React.createElement('br',{}), 'Kod QR Dinamik']),
        React.createElement('div', { className: 'auth-box' },
            React.createElement('h2', {}, isLogin ? 'Log Masuk' : 'Daftar Akaun Baru'),
            React.createElement('p', { className: 'auth-subtitle' }, isLogin ? 'Selamat kembali! Sila log masuk ke akaun anda.' : 'Cipta akaun untuk mula menyimpan Kod QR anda.'),
            React.createElement('form', { className: 'auth-form', onSubmit: handleSubmit },
                error && React.createElement('p', { className: 'error-text auth-error' }, error),
                React.createElement('div', { className: 'form-group' },
                    React.createElement('label', { htmlFor: 'email' }, 'E-mel:'),
                    React.createElement('input', { type: 'email', id: 'email', value: email, placeholder: 'anda@contoh.com', onChange: (e: any) => setEmail((e.target as HTMLInputElement).value), required: true })
                ),
                React.createElement('div', { className: 'form-group' },
                    React.createElement('label', { htmlFor: 'password' }, 'Kata Laluan:'),
                    React.createElement('input', { type: 'password', id: 'password', value: password, placeholder: '••••••••', onChange: (e: any) => setPassword((e.target as HTMLInputElement).value), required: true })
                ),
                !isLogin && React.createElement('div', { className: 'form-group' },
                    React.createElement('label', { htmlFor: 'confirm-password' }, 'Sahkan Kata Laluan:'),
                    React.createElement('input', { type: 'password', id: 'confirm-password', value: confirmPassword, placeholder: '••••••••', onChange: (e: any) => setConfirmPassword((e.target as HTMLInputElement).value), required: true })
                ),
                React.createElement('button', { type: 'submit', className: 'button primary auth-button', disabled: isLoading }, isLoading ? 'Memproses...' : (isLogin ? 'Log Masuk' : 'Daftar')),
                React.createElement('button', { type: 'button', className: 'button-link', onClick: toggleMode },
                    isLogin ? 'Tiada akaun? Daftar di sini.' : 'Sudah ada akaun? Log masuk.'
                )
            )
        )
    );
}

const qrStyleOptions = {
    1: { // Standard Square
        dotsOptions: { type: 'square', color: '#000000' },
        cornersSquareOptions: { type: 'square', color: '#000000' },
        cornersDotOptions: { type: 'square', color: '#000000' }
    },
    2: { // Original Rounded Style
        dotsOptions: { type: 'rounded', color: '#000000' },
        cornersSquareOptions: { type: 'extra-rounded', color: '#000000' },
        cornersDotOptions: { type: 'dot', color: '#000000' }
    },
    3: { // Classy Rounded with Ring Corners
        dotsOptions: { type: 'classy-rounded', color: '#000000' },
        cornersSquareOptions: { type: 'extra-rounded', color: '#000000' },
        cornersDotOptions: { type: 'square', color: '#000000' }
    },
    4: { // Approximation of detached corners
        dotsOptions: { type: 'rounded', color: '#000000' },
        cornersSquareOptions: { type: 'square', color: '#000000' },
        cornersDotOptions: { type: 'dot', color: '#000000' }
    },
    5: { // All Dots with Ring Corners
        dotsOptions: { type: 'dots', color: '#000000' },
        cornersSquareOptions: { type: 'extra-rounded', color: '#000000' },
        cornersDotOptions: { type: 'dot', color: '#000000' }
    }
};

function AdminPage({ onBack }: { onBack: () => void }) {
    const [allowedEmails, setAllowedEmails] = React.useState<{id: string, email: string}[]>([]);
    const [newEmail, setNewEmail] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const allowedEmailsCollectionRef = db.collection('allowedEmails');
    const currentUser = auth.currentUser;

    const handleFirestoreError = (err: any, operation: 'memuatkan' | 'menambah' | 'memadam'): string => {
        console.error(`Error ${operation} data e-mel: `, err);
        if (err.code === 'permission-denied') {
            const adminEmail = currentUser?.email || 'akaun admin anda';
            return `Operasi gagal: Kebenaran ditolak.\nSila pastikan Peraturan Keselamatan (Security Rules) Firebase anda membenarkan ${adminEmail} untuk membaca dan menulis ke koleksi 'allowedEmails'.`;
        }
        return `Gagal ${operation} e-mel. Sila semak sambungan internet anda atau cuba lagi.`;
    };

    React.useEffect(() => {
        setIsLoading(true);
        const unsubscribe = allowedEmailsCollectionRef.onSnapshot(
            (querySnapshot: any) => {
                const emails = querySnapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    email: doc.data().email,
                })).sort((a:any, b:any) => a.email.localeCompare(b.email));
                setAllowedEmails(emails);
                setIsLoading(false);
            },
            (err: any) => {
                setError(handleFirestoreError(err, 'memuatkan'));
                setIsLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    const handleAddEmail = async (e: any) => {
        e.preventDefault();
        const emailToAdd = newEmail.trim().toLowerCase();
        if (!emailToAdd) {
            setError("Sila masukkan alamat e-mel.");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToAdd)) {
            setError("Format e-mel tidak sah.");
            return;
        }
        if (allowedEmails.some(item => item.email === emailToAdd)) {
            setError("E-mel ini sudah wujud dalam senarai.");
            return;
        }

        setError(null);
        setIsSubmitting(true);
        try {
            await allowedEmailsCollectionRef.doc(emailToAdd).set({ email: emailToAdd });
            setNewEmail('');
        } catch (err) {
            setError(handleFirestoreError(err, 'menambah'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteEmail = async (idToDelete: string) => {
        if (confirm("Adakah anda pasti mahu memadam e-mel ini daripada senarai yang dibenarkan? Pengguna sedia ada dengan e-mel ini akan disekat daripada log masuk.")) {
            setError(null);
            setIsSubmitting(true);
            try {
                await allowedEmailsCollectionRef.doc(idToDelete).delete();
            } catch (err) {
                setError(handleFirestoreError(err, 'memadam'));
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return React.createElement('div', { className: 'admin-container' },
        React.createElement('div', { className: 'admin-pane' },
            React.createElement('div', { className: 'admin-header' },
                React.createElement('h2', {}, 'Kawalan E-mel Pendaftaran'),
                React.createElement('button', { className: 'button', onClick: onBack, title: 'Kembali ke Aplikasi Utama' }, 'Kembali')
            ),
            React.createElement('p', { className: 'admin-subtitle' }, 'Urus senarai e-mel yang dibenarkan untuk mendaftar dan menggunakan aplikasi ini.'),
            React.createElement('form', { className: 'add-email-form', onSubmit: handleAddEmail },
                React.createElement('div', { className: 'form-group' },
                    React.createElement('label', { htmlFor: 'newEmail' }, 'Tambah E-mel Baru:'),
                    React.createElement('input', {
                        type: 'email',
                        id: 'newEmail',
                        value: newEmail,
                        placeholder: 'pengguna@contoh.com',
                        onChange: (e: any) => setNewEmail((e.target as HTMLInputElement).value),
                        required: true
                    })
                ),
                React.createElement('button', { type: 'submit', className: 'button primary', disabled: isSubmitting }, isSubmitting ? 'Memproses...' : 'Tambah')
            ),
            error && React.createElement('p', { className: 'error-text', style: { whiteSpace: 'pre-wrap', textAlign: 'left' } }, error),
            React.createElement('div', { className: 'email-list-container' },
                React.createElement('h3', {}, 'Senarai E-mel Dibenarkan'),
                isLoading
                    ? React.createElement('p', {}, 'Memuatkan senarai e-mel...')
                    : allowedEmails.length === 0
                        ? React.createElement('p', { className: 'empty-list-text' }, 'Tiada e-mel yang dibenarkan lagi. Semua pendaftaran disekat.')
                        : React.createElement('ul', { className: 'saved-qr-list' },
                            ...allowedEmails.map(item =>
                                React.createElement('li', { key: item.id, className: 'saved-qr-item' },
                                    React.createElement('span', { className: 'email-list-item-text' }, item.email),
                                    React.createElement('button', {
                                        className: 'button icon-button delete-button',
                                        onClick: () => handleDeleteEmail(item.id),
                                        disabled: isSubmitting,
                                        title: `Padam ${item.email}`,
                                        dangerouslySetInnerHTML: { __html: deleteIconSvg }
                                    })
                                )
                            )
                        )
            )
        )
    );
}

function QrApp({ user, onLogout }: { user: any, onLogout: () => void }) {
    const [view, setView] = React.useState<'main' | 'admin'>('main');
    const [qrName, setQrName] = React.useState('');
    const [targetUrl, setTargetUrl] = React.useState('');
    const [qrEntries, setQrEntries] = React.useState<QREntry[]>([]);
    const [editingEntryId, setEditingEntryId] = React.useState<string | null>(null);
    const [generatedQrImageUrl, setGeneratedQrImageUrl] = React.useState<string | null>(null);
    const [qrDataThatGeneratedCurrentImage, setQrDataThatGeneratedCurrentImage] = React.useState<string | null>(null);
    const [qrStyle, setQrStyle] = React.useState<number>(1);
    const [qrMetadata, setQrMetadata] = React.useState<QrMetadata | null>(null);

    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const currentAppUrlRef = React.useRef<string>('');
    const qrsCollectionRef = db.collection('qrs');

    const constructQrData = (id: string) => `${currentAppUrlRef.current}#qrId=${id}`;

    const getHostnameFromUrl = (url: string): string => {
        if (!url) return '';
        try {
            return new URL(url).hostname;
        } catch (e) {
            const withoutProtocol = url.replace(/^https?:\/\//, '');
            const hostname = withoutProtocol.split('/')[0];
            return hostname;
        }
    };

    React.useEffect(() => {
        let appUrl = window.location.href.split('#')[0];
        if (!appUrl.endsWith('/')) {
            appUrl = appUrl.substring(0, appUrl.lastIndexOf('/') + 1);
        }
        appUrl += 'index.html';
        currentAppUrlRef.current = appUrl;
    }, []);

    React.useEffect(() => {
        if (!user) {
            setQrEntries([]);
            return;
        }
        setIsLoading(true);
        const unsubscribe = qrsCollectionRef
            .where('ownerId', '==', user.uid)
            .onSnapshot(
                (querySnapshot: any) => {
                    if (querySnapshot) {
                        const data = querySnapshot.docs.map((doc: any) => ({
                            id: doc.id,
                            ...doc.data(),
                        })) as QREntry[];
                        const sortedData = data.sort((a, b) => {
                            const timeA = a.createdAt?.seconds ?? 0;
                            const timeB = b.createdAt?.seconds ?? 0;
                            return timeB - timeA;
                        });
                        setQrEntries(sortedData);
                    } else {
                        setQrEntries([]);
                    }
                    setIsLoading(false);
                    setError(null);
                },
                (err: any) => {
                    console.error("Error listening to documents: ", err);
                    setError("Gagal mengambil data. Sila pastikan anda mempunyai sambungan internet.");
                    setIsLoading(false);
                    setQrEntries([]);
                }
            );
        return () => unsubscribe();
    }, [user]);

    const displayQRCode = async (data: string) => {
        if (!data) {
            clearQrDisplay();
            setQrMetadata(null);
            return;
        }
        try {
            const ecc: 'L' | 'M' | 'Q' | 'H' = 'L'; // Use Low ECC for smaller modules
            const metadata = calculateQrMetadata(data, ecc);
            setQrMetadata(metadata);
            if (metadata?.warning && metadata.chosen_version === 0) {
                alert(metadata.warning);
                clearQrDisplay();
                return;
            }
            const style = qrStyleOptions[qrStyle as keyof typeof qrStyleOptions];
            const qrCode = new QRCodeStyling({
                width: 200,
                height: 200,
                margin: 0,
                data: data,
                dotsOptions: style.dotsOptions,
                cornersSquareOptions: style.cornersSquareOptions,
                cornersDotOptions: style.cornersDotOptions,
                qrOptions: { errorCorrectionLevel: ecc },
                backgroundOptions: { color: '#ffffff' }
            });
            const blob = await qrCode.getRawData('png');
            if (blob) {
                if (generatedQrImageUrl && generatedQrImageUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(generatedQrImageUrl);
                }
                const imageUrl = URL.createObjectURL(blob);
                setGeneratedQrImageUrl(imageUrl);
                setQrDataThatGeneratedCurrentImage(data);
            }
        } catch (error) {
            console.error("Gagal menjana Kod QR:", error);
            clearQrDisplay();
            alert("Gagal menjana Kod QR.");
        }
    };

    React.useEffect(() => {
        if (qrDataThatGeneratedCurrentImage) {
            displayQRCode(qrDataThatGeneratedCurrentImage);
        }
    }, [qrStyle]);

    const handleGenerateOrUpdate = async () => {
        if (!qrName.trim() || !targetUrl.trim()) {
            alert("Nama Kod QR dan URL Sasaran tidak boleh kosong.");
            return;
        }

        let correctedUrl = targetUrl.trim();
        if (!correctedUrl.startsWith('http://') && !correctedUrl.startsWith('https://')) {
            correctedUrl = `https://${correctedUrl}`;
        }
        try {
            new URL(correctedUrl);
        } catch (_) {
            alert("Format URL Sasaran tidak sah. Sila pastikan ia adalah pautan yang betul.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            if (editingEntryId) {
                const docRef = qrsCollectionRef.doc(editingEntryId);
                const dataToUpdate = { name: qrName.trim(), targetUrl: correctedUrl };
                await docRef.update(dataToUpdate);
                displayQRCode(constructQrData(editingEntryId));
            } else {
                const entryData = {
                    name: qrName.trim(),
                    targetUrl: correctedUrl,
                    ownerId: user.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                const docRef = await qrsCollectionRef.add(entryData);
                displayQRCode(constructQrData(docRef.id));
                clearFormFieldsOnly();
            }
        } catch (e: any) {
            const permissionDenied = e.code === 'permission-denied';
            setError(permissionDenied
                ? 'Operasi gagal: Kebenaran ditolak. Sila semak Peraturan Keselamatan (Security Rules) pangkalan data anda.'
                : 'Gagal menyimpan data ke Firestore.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (entryToEdit: QREntry) => {
        setQrName(entryToEdit.name);
        setTargetUrl(entryToEdit.targetUrl);
        setEditingEntryId(entryToEdit.id);
        displayQRCode(constructQrData(entryToEdit.id));
    };

    const handleDelete = async (idToDelete: string) => {
        if (confirm("Adakah anda pasti mahu memadam Kod QR ini?")) {
            setError(null);
            try {
                await qrsCollectionRef.doc(idToDelete).delete();
                const entryBeingDeleted = qrEntries.find(e => e.id === idToDelete);
                if (editingEntryId === idToDelete) {
                    clearFullFormAndDisplay();
                } else if (entryBeingDeleted && constructQrData(entryBeingDeleted.id) === qrDataThatGeneratedCurrentImage) {
                    clearQrDisplay();
                } else if (qrEntries.length === 1) {
                    clearQrDisplay();
                }
            } catch(e: any) {
                setError('Gagal memadam data dari Firestore.');
                console.error(e);
            }
        }
    };

    const clearQrDisplay = () => {
        setGeneratedQrImageUrl(null);
        setQrDataThatGeneratedCurrentImage(null);
    }

    const handleDownloadQRCode = () => {
        if (!qrDataThatGeneratedCurrentImage || !qrMetadata || qrMetadata.chosen_version === 0) {
            alert("Tiada Kod QR yang sah untuk dimuat turun.");
            return;
        }
        let filenamePrefix = 'kod_qr';
        let urlHostname = 'destinasi';
        const qrIdMatch = qrDataThatGeneratedCurrentImage.match(/#qrId=([^&]+)/);
        if (qrIdMatch) {
            const id = qrIdMatch[1];
            const entry = qrEntries.find(e => e.id === id);
            if (entry) {
                filenamePrefix = entry.name.trim();
                urlHostname = getHostnameFromUrl(entry.targetUrl);
            }
        } else {
            if (qrName.trim()) {
                filenamePrefix = qrName.trim();
                urlHostname = getHostnameFromUrl(targetUrl.trim());
            }
        }
        const safePrefix = filenamePrefix.replace(/[^a-z0-9_.-]/gi, '_');
        const safeHostname = urlHostname.replace(/[^a-z0-9_.-]/gi, '_');

        try {
            const style = qrStyleOptions[qrStyle as keyof typeof qrStyleOptions];
            const downloadQrSize = 1024;

            const qrCode = new QRCodeStyling({
                width: downloadQrSize,
                height: downloadQrSize,
                margin: 40,
                data: qrDataThatGeneratedCurrentImage,
                dotsOptions: style.dotsOptions,
                cornersSquareOptions: style.cornersSquareOptions,
                cornersDotOptions: style.cornersDotOptions,
                qrOptions: { errorCorrectionLevel: 'L' },
                backgroundOptions: { color: '#ffffff' }
            });
            qrCode.download({
                name: `${safePrefix}_(${safeHostname})`,
                extension: 'png'
            });
        } catch (error) {
            console.error("Gagal menjana Kod QR untuk muat turun:", error);
            alert("Gagal menjana Kod QR resolusi tinggi untuk muat turun.");
        }
    };

    const clearFormFieldsOnly = () => {
        setQrName('');
        setTargetUrl('');
    };

    const clearFullFormAndDisplay = () => {
        clearFormFieldsOnly();
        setEditingEntryId(null);
        clearQrDisplay();
        setQrMetadata(null);
    };

    if (view === 'admin') {
        return React.createElement(AdminPage, { onBack: () => setView('main') });
    }

    return React.createElement('div', { className: 'container' },
        React.createElement('h1', { className: isAdminEmail(user.email) ? 'admin-title' : undefined }, ['Penjana', React.createElement('br',{}), 'Kod QR Dinamik']),
        React.createElement('div', { className: 'app-layout' },
            React.createElement('div', { className: 'editor-pane' },
                React.createElement('h2', {}, editingEntryId ? 'Sunting Kod QR' : 'Jana Kod QR Baru'),
                React.createElement('div', { className: 'form-group' },
                    React.createElement('label', { htmlFor: 'qrName' }, 'Nama Kod QR:'),
                    React.createElement('input', { type: 'text', id: 'qrName', value: qrName, placeholder: 'Contoh: FesbukKu', onChange: (e: any) => setQrName((e.target as HTMLInputElement).value) })
                ),
                React.createElement('div', { className: 'form-group' },
                    React.createElement('label', { htmlFor: 'targetUrl' }, 'Pautan:'),
                    React.createElement('input', { type: 'url', id: 'targetUrl', value: targetUrl, placeholder: 'https://contoh.com/FesbukKu', onChange: (e: any) => setTargetUrl((e.target as HTMLInputElement).value) })
                ),
                React.createElement('div', { className: 'form-actions' },
                    React.createElement('button', { className: 'button primary', onClick: handleGenerateOrUpdate, disabled: isLoading, title: editingEntryId ? 'Simpan perubahan' : 'Jana Kod QR baru' }, isLoading ? 'Memproses...' : (editingEntryId ? 'KEMASKINI' : 'JANA')),
                    React.createElement('button', { className: 'button', onClick: clearFullFormAndDisplay, disabled: isLoading, title: editingEntryId ? 'Batal Suntingan' : 'Set Semula Borang' }, editingEntryId ? 'BATAL' : 'RESET')
                ),
                React.createElement('div', { className: 'qrcode-container' },
                    React.createElement('div', { id: 'qrcode-display-visible', className: 'qrcode-display', 'aria-live': 'polite' },
                        generatedQrImageUrl
                            ? React.createElement('img', { src: generatedQrImageUrl, alt: 'Kod QR yang dijana', style: { maxWidth: '100%', height: 'auto' }})
                            : React.createElement('p', { className: 'placeholder-text'}, 'Kod QR akan dipaparkan di sini')
                    ),
                    React.createElement('div', { className: 'style-selector' },
                        ...[1, 2, 3, 4, 5].map(styleNum =>
                            React.createElement('button', {
                                key: styleNum,
                                className: `style-option ${qrStyle === styleNum ? 'active' : ''}`,
                                onClick: () => setQrStyle(styleNum),
                                title: `Pilih Gaya ${styleNum}`,
                                'aria-label': `Pilih Gaya ${styleNum}`
                            }, styleNum)
                        )
                    )
                ),
                generatedQrImageUrl && React.createElement('button', { className: 'button download-button', onClick: handleDownloadQRCode, disabled: !generatedQrImageUrl }, 'MUAT TURUN')
            ),
            React.createElement('div', { className: 'saved-pane' },
                React.createElement('h2', {}, 'Senarai Kod QR Disimpan'),
                error && React.createElement('p', { className: 'error-text' }, error),
                isLoading && React.createElement('p', {}, 'Memuatkan...'),
                !isLoading && qrEntries.length === 0
                    ? React.createElement('p', { className: 'empty-list-text' }, 'Tiada Kod QR disimpan lagi.')
                    : React.createElement('ul', { className: 'saved-qr-list', 'aria-label': 'Senarai Kod QR yang telah disimpan' },
                        ...qrEntries.map(entry =>
                            React.createElement('li', { key: entry.id, className: 'saved-qr-item', 'aria-labelledby': `qr-name-${entry.id}` },
                                React.createElement('div', { className: 'item-info' },
                                    React.createElement('strong', { id: `qr-name-${entry.id}` }, entry.name),
                                    React.createElement('span', {className: 'target-url-display'}, getHostnameFromUrl(entry.targetUrl)),
                                    entry.createdAt && React.createElement('span', { className: 'timestamp-display' }, formatFirestoreTimestamp(entry.createdAt))
                                ),
                                React.createElement('div', { className: 'item-actions' },
                                    React.createElement('button', { className: 'button icon-button edit-button', onClick: () => handleEdit(entry), title: `Sunting ${entry.name}`, dangerouslySetInnerHTML: { __html: editIconSvg } }),
                                    React.createElement('button', { className: 'button icon-button delete-button', onClick: () => handleDelete(entry.id), title: `Padam ${entry.name}`, dangerouslySetInnerHTML: { __html: deleteIconSvg } })
                                )
                            )
                        )
                    )
            )
        ),
        React.createElement('div', { className: 'footer-section' },
            React.createElement('button', { className: 'button', onClick: onLogout, title: 'Log Keluar' }, 'Log Keluar'),
            isAdminEmail(user.email) && React.createElement('button', {
                className: 'button',
                onClick: () => setView('admin'),
                title: 'Menu Pentadbir'
            }, 'Menu Admin'),
            React.createElement('p', { className: 'copyright-footer' }, '© 2025 NizarSalleh@PKK')
        )
    );
}

function App() {
    // Initialize state directly from the auth object to be resilient to state wipes
    const [user, setUser] = React.useState<any | null>(() => auth.currentUser);
    const [authLoading, setAuthLoading] = React.useState(() => !auth.currentUser);
    const [redirectMessage, setRedirectMessage] = React.useState<string>('');

    React.useEffect(() => {
        // Listen for auth state changes
        const unsubscribe = auth.onAuthStateChanged((currentUser: any) => {
            setUser(currentUser);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    React.useEffect(() => {
        const handleRedirect = async () => {
            const hash = window.location.hash;
            if (hash.startsWith('#qrId=')) {
                const idToRedirect = hash.substring('#qrId='.length);
                
                // Sanity check
                if (!idToRedirect.trim()) {
                     setRedirectMessage('Pautan rosak: ID tidak dijumpai.');
                     return;
                }

                setRedirectMessage('Mencari URL...');
                try {
                    const docRef = db.collection('qrs').doc(idToRedirect);
                    const docSnap = await docRef.get();

                    if (!docSnap.exists) {
                        setRedirectMessage('Kod QR tidak dijumpai. Ia mungkin telah dipadam.');
                        return;
                    }

                    const entryToRedirect = docSnap.data() as Omit<QREntry, 'id'>;
                    
                    if (!entryToRedirect.targetUrl) {
                        setRedirectMessage('URL sasaran kosong.');
                         return;
                    }

                    setRedirectMessage(`Mengalihkan ke: ${entryToRedirect.targetUrl}...`);
                    setTimeout(() => {
                        window.location.href = entryToRedirect.targetUrl;
                    }, 1500);
                } catch (e: any) {
                    // Enhanced error handling for debugging
                    console.error("Redirect Error:", e);
                    let friendlyError = 'Ralat tidak diketahui.';
                    
                    if (e.code === 'permission-denied') {
                        friendlyError = 'Akses Ditolak: Peraturan keselamatan Firestore menghalang bacaan awam. Sila kemaskini "Firestore Security Rules".';
                    } else if (e.code === 'unavailable') {
                        friendlyError = 'Ralat Rangkaian: Sila semak sambungan internet anda.';
                    } else {
                        friendlyError = `Ralat: ${e.message || e.toString()}`;
                    }

                    setRedirectMessage(`Gagal mengalihkan. ${friendlyError}`);
                }
            }
        };

        handleRedirect();
    }, []);

    const handleLogout = () => {
        auth.signOut();
    };

    if (redirectMessage) {
        return React.createElement('div', { className: 'container redirect-notice' },
            React.createElement('h1', {}, ['Penjana', React.createElement('br',{}), 'Kod QR Dinamik']),
            React.createElement('p', { style: { color: '#ff6b6b', whiteSpace: 'pre-wrap' } }, redirectMessage)
        );
    }

    if (authLoading) {
        return React.createElement('div', { className: 'container redirect-notice' },
            React.createElement('h1', {}, ['Penjana', React.createElement('br',{}), 'Kod QR Dinamik']),
            React.createElement('p', {}, 'Memuatkan aplikasi...')
        );
    }

    if (!user) {
        return React.createElement(AuthPage, {});
    }

    // Pass key to reset state when user changes
    return React.createElement(QrApp, { user, onLogout: handleLogout, key: user.uid });
}

document.addEventListener('DOMContentLoaded', () => {
    const rootElement = document.getElementById('app');
    if (rootElement) {
        const root = createRoot(rootElement);
        root.render(React.createElement(App));
    } else {
        console.error("Elemen root #app tidak dijumpai dalam DOM.");
    }
});