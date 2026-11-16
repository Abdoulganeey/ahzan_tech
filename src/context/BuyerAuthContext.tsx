import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  logFirestoreError,
  OperationType,
} from '../firebase';
import type { IncotermCode } from '../data/tradeData';

export type RfqStatus =
  | 'Submitted'
  | 'Under Executive Review'
  | 'SCO / Proforma Issued'
  | 'L/C Confirmed'
  | 'Export Cleared';

export type ShipmentStatus =
  | 'Mine / Farm Gate'
  | 'SGS Assay Verification'
  | 'NESS & Customs Cleared'
  | 'In Ocean Transit'
  | 'Discharged at Port';

export type TradeDocType =
  | 'Proforma Invoice'
  | 'SGS Assay Certificate'
  | 'Bill of Lading'
  | 'Certificate of Origin'
  | 'Phytosanitary Certificate'
  | 'Form NXP / NESS Clearance';

export type TradeDocStatus = 'Verified' | 'Pending Countersignature' | 'Archived';

export interface BuyerProfileDoc {
  buyerUid: string;
  companyName: string;
  contactName: string;
  email: string;
  defaultPort: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface BuyerRfqDoc {
  id: string;
  buyerUid: string;
  refId: string;
  companyName: string;
  contactName: string;
  corporateEmail: string;
  destinationPort: string;
  commoditySummary: string;
  targetVolume: string;
  incoterm: IncotermCode;
  paymentTerms: string;
  specifications?: string;
  status: RfqStatus;
  estimatedValueUsd?: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface BuyerShipmentDoc {
  id: string;
  buyerUid: string;
  trackingCode: string;
  rfqRefId: string;
  commodity: string;
  originPort: string;
  destinationPort: string;
  vesselName: string;
  billOfLadingNo: string;
  containerAllocation: string;
  stageIndex: number;
  status: ShipmentStatus;
  etaDate: string;
  lastUpdateNote: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface TradeDocumentDoc {
  id: string;
  buyerUid: string;
  docCode: string;
  title: string;
  docType: TradeDocType;
  rfqRefId: string;
  commodity: string;
  issuer: string;
  issuedDate: string;
  status: TradeDocStatus;
  summaryText: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface NewRfqInput {
  refId: string;
  companyName: string;
  contactName: string;
  corporateEmail: string;
  destinationPort: string;
  commoditySummary: string;
  targetVolume: string;
  incoterm: IncotermCode;
  paymentTerms: string;
  specifications?: string;
  estimatedValueUsd?: number;
}

interface BuyerAuthContextValue {
  user: User | null;
  isAdminUser: boolean;
  authReady: boolean;
  signingIn: boolean;
  authError: string | null;
  dataLoading: boolean;
  dataError: string | null;
  profile: BuyerProfileDoc | null;
  rfqs: BuyerRfqDoc[];
  shipments: BuyerShipmentDoc[];
  tradeDocuments: TradeDocumentDoc[];
  allRfqs: BuyerRfqDoc[];
  allShipments: BuyerShipmentDoc[];
  allTradeDocuments: TradeDocumentDoc[];
  signInWithGoogle: () => Promise<void>;
  signOutBuyer: () => Promise<void>;
  saveNewRfqToFirestore: (input: NewRfqInput) => Promise<void>;
  updateBuyerProfile: (updates: {
    companyName: string;
    contactName: string;
    defaultPort: string;
  }) => Promise<void>;
  updateRfqDetails: (
    rfqId: string,
    updates: {
      destinationPort: string;
      targetVolume: string;
      specifications: string;
    }
  ) => Promise<void>;
  appendShipmentNote: (shipmentId: string, note: string) => Promise<void>;
  archiveTradeDocument: (docId: string) => Promise<void>;
  adminUpdateRfqStatus: (rfqId: string, status: RfqStatus) => Promise<void>;
  adminUpdateShipmentStage: (
    shipmentId: string,
    updates: {
      stageIndex: number;
      status: ShipmentStatus;
      lastUpdateNote: string;
    }
  ) => Promise<void>;
  adminVerifyTradeDocument: (docId: string) => Promise<void>;
}

const ADMIN_EMAIL = 'abdoulganeey@gmail.com';
const BuyerAuthContext = createContext<BuyerAuthContextValue | null>(null);

function sanitizeIdPart(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned.length > 0 ? cleaned.slice(0, 24) : 'buyer';
}

function getMillis(ts?: Timestamp | null): number {
  if (!ts || typeof ts.toMillis !== 'function') return 0;
  return ts.toMillis();
}

export function BuyerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [profile, setProfile] = useState<BuyerProfileDoc | null>(null);
  const [rfqs, setRfqs] = useState<BuyerRfqDoc[]>([]);
  const [shipments, setShipments] = useState<BuyerShipmentDoc[]>([]);
  const [tradeDocuments, setTradeDocuments] = useState<TradeDocumentDoc[]>([]);

  const [allRfqs, setAllRfqs] = useState<BuyerRfqDoc[]>([]);
  const [allShipments, setAllShipments] = useState<BuyerShipmentDoc[]>([]);
  const [allTradeDocuments, setAllTradeDocuments] = useState<TradeDocumentDoc[]>([]);

  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const seededUidRef = useRef<string | null>(null);

  const isAdminUser = Boolean(
    user?.emailVerified && user.email === ADMIN_EMAIL
  );

  // Listen for Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        setProfile(null);
        setRfqs([]);
        setShipments([]);
        setTradeDocuments([]);
        setAllRfqs([]);
        setAllShipments([]);
        setAllTradeDocuments([]);
        setDataError(null);
        seededUidRef.current = null;
      }
    });
    return () => unsub();
  }, []);

  const seedStarterBuyerPortfolio = useCallback(async (currentUser: User) => {
    if (!currentUser.email || seededUidRef.current === currentUser.uid) {
      return;
    }
    seededUidRef.current = currentUser.uid;

    const uid = currentUser.uid;
    const prefix = sanitizeIdPart(uid.slice(0, 10));
    const displayName = (currentUser.displayName || 'Authorized Buyer').slice(0, 120);
    const email = currentUser.email.slice(0, 160);
    const now = serverTimestamp();

    const batch = writeBatch(db);

    batch.set(doc(db, 'buyers', uid), {
      buyerUid: uid,
      companyName: 'Global Commodity Offtake Partner',
      contactName: displayName,
      email,
      defaultPort: 'Rotterdam, NL / Qingdao, CN',
      createdAt: now,
      updatedAt: now,
    });

    const rfq1Id = `rfq-${prefix}-li2o`;
    const rfq2Id = `rfq-${prefix}-agro`;

    batch.set(doc(db, 'rfqs', rfq1Id), {
      buyerUid: uid,
      refId: 'AHT-RFQ-65197A',
      companyName: 'Global Commodity Offtake Partner',
      contactName: displayName,
      corporateEmail: email,
      destinationPort: 'Qingdao, China',
      commoditySummary: 'Lithium Ore (4.61% Li2O @ $207/%) — Ref ZMGN057',
      targetVolume: '54 MT (2 × 20ft FCL)',
      incoterm: 'FOB',
      paymentTerms: 'Irrevocable L/C at Sight (UCP 600)',
      specifications:
        'Contract rate $207 per 1% Li2O ($954.27/MT FOB at 4.61% Li2O). SGS umpire ICP-OES & XRF sampling at Apapa Wharf.',
      status: 'L/C Confirmed',
      estimatedValueUsd: 51531,
      createdAt: now,
      updatedAt: now,
    });

    batch.set(doc(db, 'rfqs', rfq2Id), {
      buyerUid: uid,
      refId: 'AHT-RFQ-2026B',
      companyName: 'Global Commodity Offtake Partner',
      contactName: displayName,
      corporateEmail: email,
      destinationPort: 'Rotterdam, Netherlands',
      commoditySummary: 'Natural Whitish Sesame Seeds (Machine Cleaned 99/1)',
      targetVolume: '36 MT (2 × 20ft FCL)',
      incoterm: 'CIF',
      paymentTerms: 'T/T 30% Advance / 70% Against B/L & SGS',
      specifications:
        'FOB Lagos benchmark $1,400/MT. Packed in 50 kg new woven PP bags with NAQS Phytosanitary & EU MRL inspection.',
      status: 'SCO / Proforma Issued',
      estimatedValueUsd: 53928,
      createdAt: now,
      updatedAt: now,
    });

    const ship1Id = `ship-${prefix}-01`;
    const ship2Id = `ship-${prefix}-02`;

    batch.set(doc(db, 'shipments', ship1Id), {
      buyerUid: uid,
      trackingCode: 'AHT-SHP-88412',
      rfqRefId: 'AHT-RFQ-65197A',
      commodity: 'Lithium-Bearing Spodumene Ore (4.61% Li2O)',
      originPort: 'Apapa Wharf, Lagos',
      destinationPort: 'Qingdao, China',
      vesselName: 'MV Atlantic Meridian V.412E',
      billOfLadingNo: 'MAEU-APP-992104',
      containerAllocation: '2 × 20ft FCL (54 MT Net)',
      stageIndex: 4,
      status: 'In Ocean Transit',
      etaDate: '2026-12-14',
      lastUpdateNote:
        'Vessel departed Apapa Terminal after SGS Lot #ZMGN057 sealing and NESS export clearance.',
      createdAt: now,
      updatedAt: now,
    });

    batch.set(doc(db, 'shipments', ship2Id), {
      buyerUid: uid,
      trackingCode: 'AHT-SHP-88439',
      rfqRefId: 'AHT-RFQ-2026B',
      commodity: 'Whitish Sesame Seeds (99/1 Machine Cleaned)',
      originPort: 'Tin Can Island, Lagos',
      destinationPort: 'Rotterdam, Netherlands',
      vesselName: 'CMA CGM West Africa Express',
      billOfLadingNo: 'PENDING-BL-88439',
      containerAllocation: '2 × 20ft FCL (36 MT Net)',
      stageIndex: 2,
      status: 'SGS Assay Verification',
      etaDate: '2026-12-06',
      lastUpdateNote:
        'Bags staged at Tin Can export warehouse; SGS moisture, oil yield (50.4%), and NAQS sampling underway.',
      createdAt: now,
      updatedAt: now,
    });

    const docsSeed: Array<{
      id: string;
      docCode: string;
      title: string;
      docType: TradeDocType;
      rfqRefId: string;
      commodity: string;
      issuer: string;
      issuedDate: string;
      status: TradeDocStatus;
      summaryText: string;
    }> = [
      {
        id: `doc-${prefix}-sgs`,
        docCode: 'ZMGN057-ASSAY',
        title: 'Geochemical ICP-OES Lithium Assay Certificate (4.61% Li2O)',
        docType: 'SGS Assay Certificate',
        rfqRefId: 'AHT-RFQ-65197A',
        commodity: 'Nigerian Spodumene / Lepidolite Ore',
        issuer: 'SGS Mineral Services Nigeria',
        issuedDate: '2026-11-08',
        status: 'Verified',
        summaryText:
          'Confirmed Li2O content: 4.61% · Fe2O3: 1.08% · Moisture: 1.4% · Contract Rate: US$207 per 1% Li2O ($954.27/MT FOB) · MCO Licence No. 65197 EL.',
      },
      {
        id: `doc-${prefix}-bl`,
        docCode: 'MAEU-APP-992104',
        title: 'Clean On-Board Ocean Bill of Lading (2 × 20ft FCL)',
        docType: 'Bill of Lading',
        rfqRefId: 'AHT-RFQ-65197A',
        commodity: 'Lithium Ore (54 MT Jumbo Bags)',
        issuer: 'Maersk Line · Apapa Wharf',
        issuedDate: '2026-11-12',
        status: 'Verified',
        summaryText:
          'Shipper: Ahzan Tech Ltd (RC 2012723) · Port of Loading: Apapa Wharf, Lagos · Port of Discharge: Qingdao, China · Freight: As Per L/C.',
      },
      {
        id: `doc-${prefix}-ness`,
        docCode: 'NESS-NXP-77104',
        title: 'Form NXP & Nigerian Export Supervision Scheme (NESS) Clearance',
        docType: 'Form NXP / NESS Clearance',
        rfqRefId: 'AHT-RFQ-65197A',
        commodity: 'Critical Minerals Lot #65197-EL',
        issuer: 'Central Bank of Nigeria / Cobalt International',
        issuedDate: '2026-11-10',
        status: 'Verified',
        summaryText:
          'Verified Clean Certificate of Inspection (CCI) & non-oil mineral royalty settlement under NEPC Export Licence and FIRS TCC compliance.',
      },
      {
        id: `doc-${prefix}-proforma`,
        docCode: 'AHT-PI-202611',
        title: 'Signed Proforma Invoice — Whitish Sesame Seeds (99/1)',
        docType: 'Proforma Invoice',
        rfqRefId: 'AHT-RFQ-2026B',
        commodity: 'Natural Whitish Sesame Seeds (36 MT)',
        issuer: 'Ahzan Tech Ltd · Executive Trade Desk',
        issuedDate: '2026-11-15',
        status: 'Pending Countersignature',
        summaryText:
          'Quoted per Official 2026-11-15 Price List: US$1,400/MT FOB Lagos (36 MT = $50,400 FOB + CIF Rotterdam adjustment). Settlement: 30/70 T/T or L/C.',
      },
    ];

    for (const d of docsSeed) {
      batch.set(doc(db, 'tradeDocuments', d.id), {
        buyerUid: uid,
        docCode: d.docCode,
        title: d.title,
        docType: d.docType,
        rfqRefId: d.rfqRefId,
        commodity: d.commodity,
        issuer: d.issuer,
        issuedDate: d.issuedDate,
        status: d.status,
        summaryText: d.summaryText,
        createdAt: now,
        updatedAt: now,
      });
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `buyers/${uid}`);
    }
  }, []);

  // Attach real-time Firestore listeners ONLY when auth is ready and user is signed in
  useEffect(() => {
    if (!authReady || !user) return;

    setDataLoading(true);
    setDataError(null);

    const profileRef = doc(db, 'buyers', user.uid);
    const unsubProfile = onSnapshot(
      profileRef,
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as BuyerProfileDoc);
        } else {
          setProfile(null);
          void seedStarterBuyerPortfolio(user).catch((err) => {
            setDataError(
              err instanceof Error
                ? err.message
                : 'Failed to initialize buyer workspace.'
            );
          });
        }
        setDataLoading(false);
      },
      (error) => {
        const msg = logFirestoreError(
          error,
          OperationType.GET,
          `buyers/${user.uid}`
        );
        setDataError(msg);
        setDataLoading(false);
      }
    );

    const rfqsQuery = query(
      collection(db, 'rfqs'),
      where('buyerUid', '==', user.uid)
    );
    const unsubRfqs = onSnapshot(
      rfqsQuery,
      (snap) => {
        const items = snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<BuyerRfqDoc, 'id'>),
          }))
          .sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
        setRfqs(items);
      },
      (error) => {
        setDataError(logFirestoreError(error, OperationType.LIST, 'rfqs'));
      }
    );

    const shipmentsQuery = query(
      collection(db, 'shipments'),
      where('buyerUid', '==', user.uid)
    );
    const unsubShipments = onSnapshot(
      shipmentsQuery,
      (snap) => {
        const items = snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<BuyerShipmentDoc, 'id'>),
          }))
          .sort((a, b) => getMillis(b.updatedAt) - getMillis(a.updatedAt));
        setShipments(items);
      },
      (error) => {
        setDataError(logFirestoreError(error, OperationType.LIST, 'shipments'));
      }
    );

    const docsQuery = query(
      collection(db, 'tradeDocuments'),
      where('buyerUid', '==', user.uid)
    );
    const unsubDocs = onSnapshot(
      docsQuery,
      (snap) => {
        const items = snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<TradeDocumentDoc, 'id'>),
          }))
          .sort((a, b) => b.issuedDate.localeCompare(a.issuedDate));
        setTradeDocuments(items);
      },
      (error) => {
        setDataError(
          logFirestoreError(error, OperationType.LIST, 'tradeDocuments')
        );
      }
    );

    // Executive Admin global listeners (only attached for verified admin account)
    let unsubAdminRfqs = () => {};
    let unsubAdminShipments = () => {};
    let unsubAdminDocs = () => {};

    if (isAdminUser) {
      unsubAdminRfqs = onSnapshot(
        collection(db, 'rfqs'),
        (snap) => {
          const items = snap.docs
            .map((d) => ({
              id: d.id,
              ...(d.data() as Omit<BuyerRfqDoc, 'id'>),
            }))
            .sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
          setAllRfqs(items);
        },
        (error) => {
          logFirestoreError(error, OperationType.LIST, 'rfqs (admin)');
        }
      );

      unsubAdminShipments = onSnapshot(
        collection(db, 'shipments'),
        (snap) => {
          const items = snap.docs
            .map((d) => ({
              id: d.id,
              ...(d.data() as Omit<BuyerShipmentDoc, 'id'>),
            }))
            .sort((a, b) => getMillis(b.updatedAt) - getMillis(a.updatedAt));
          setAllShipments(items);
        },
        (error) => {
          logFirestoreError(error, OperationType.LIST, 'shipments (admin)');
        }
      );

      unsubAdminDocs = onSnapshot(
        collection(db, 'tradeDocuments'),
        (snap) => {
          const items = snap.docs
            .map((d) => ({
              id: d.id,
              ...(d.data() as Omit<TradeDocumentDoc, 'id'>),
            }))
            .sort((a, b) => b.issuedDate.localeCompare(a.issuedDate));
          setAllTradeDocuments(items);
        },
        (error) => {
          logFirestoreError(error, OperationType.LIST, 'tradeDocuments (admin)');
        }
      );
    }

    return () => {
      unsubProfile();
      unsubRfqs();
      unsubShipments();
      unsubDocs();
      unsubAdminRfqs();
      unsubAdminShipments();
      unsubAdminDocs();
    };
  }, [authReady, user, isAdminUser, seedStarterBuyerPortfolio]);

  const signInWithGoogle = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Unable to complete sign-in.';
      setAuthError(msg);
    } finally {
      setSigningIn(false);
    }
  };

  const signOutBuyer = async () => {
    setAuthError(null);
    await signOut(auth);
  };

  const saveNewRfqToFirestore = async (input: NewRfqInput) => {
    if (!user) return;
    const safeId = sanitizeIdPart(input.refId);
    const rfqDocId = `${safeId}-${Date.now()}`;
    const docPath = `rfqs/${rfqDocId}`;

    const payload: Record<string, unknown> = {
      buyerUid: user.uid,
      refId: safeId,
      companyName: input.companyName.trim().slice(0, 160),
      contactName: input.contactName.trim().slice(0, 120),
      corporateEmail: input.corporateEmail.trim().slice(0, 160),
      destinationPort: input.destinationPort.trim().slice(0, 120),
      commoditySummary: input.commoditySummary.trim().slice(0, 300),
      targetVolume: input.targetVolume.trim().slice(0, 120),
      incoterm: input.incoterm,
      paymentTerms: input.paymentTerms.trim().slice(0, 120),
      status: 'Submitted' as RfqStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (input.specifications && input.specifications.trim().length > 0) {
      payload.specifications = input.specifications.trim().slice(0, 1000);
    }
    if (
      typeof input.estimatedValueUsd === 'number' &&
      Number.isFinite(input.estimatedValueUsd) &&
      input.estimatedValueUsd >= 0
    ) {
      payload.estimatedValueUsd = Math.round(input.estimatedValueUsd);
    }

    try {
      await setDoc(doc(db, 'rfqs', rfqDocId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  };

  const updateBuyerProfile = async (updates: {
    companyName: string;
    contactName: string;
    defaultPort: string;
  }) => {
    if (!user) return;
    const docPath = `buyers/${user.uid}`;
    try {
      await updateDoc(doc(db, 'buyers', user.uid), {
        companyName: updates.companyName.trim().slice(0, 160),
        contactName: updates.contactName.trim().slice(0, 120),
        defaultPort: updates.defaultPort.trim().slice(0, 120),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const updateRfqDetails = async (
    rfqId: string,
    updates: {
      destinationPort: string;
      targetVolume: string;
      specifications: string;
    }
  ) => {
    if (!user) return;
    const docPath = `rfqs/${rfqId}`;
    try {
      await updateDoc(doc(db, 'rfqs', rfqId), {
        destinationPort: updates.destinationPort.trim().slice(0, 120),
        targetVolume: updates.targetVolume.trim().slice(0, 120),
        specifications: updates.specifications.trim().slice(0, 1000),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const appendShipmentNote = async (shipmentId: string, note: string) => {
    if (!user) return;
    const trimmed = note.trim().slice(0, 320);
    if (trimmed.length < 4) return;
    const docPath = `shipments/${shipmentId}`;
    try {
      await updateDoc(doc(db, 'shipments', shipmentId), {
        lastUpdateNote: trimmed,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const archiveTradeDocument = async (docId: string) => {
    if (!user) return;
    const docPath = `tradeDocuments/${docId}`;
    try {
      await updateDoc(doc(db, 'tradeDocuments', docId), {
        status: 'Archived' as TradeDocStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const adminUpdateRfqStatus = async (rfqId: string, status: RfqStatus) => {
    if (!isAdminUser) return;
    const docPath = `rfqs/${rfqId}`;
    try {
      await updateDoc(doc(db, 'rfqs', rfqId), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const adminUpdateShipmentStage = async (
    shipmentId: string,
    updates: {
      stageIndex: number;
      status: ShipmentStatus;
      lastUpdateNote: string;
    }
  ) => {
    if (!isAdminUser) return;
    const docPath = `shipments/${shipmentId}`;
    try {
      await updateDoc(doc(db, 'shipments', shipmentId), {
        stageIndex: updates.stageIndex,
        status: updates.status,
        lastUpdateNote: updates.lastUpdateNote.trim().slice(0, 320),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const adminVerifyTradeDocument = async (docId: string) => {
    if (!isAdminUser) return;
    const docPath = `tradeDocuments/${docId}`;
    try {
      await updateDoc(doc(db, 'tradeDocuments', docId), {
        status: 'Verified' as TradeDocStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  return (
    <BuyerAuthContext.Provider
      value={{
        user,
        isAdminUser,
        authReady,
        signingIn,
        authError,
        dataLoading,
        dataError,
        profile,
        rfqs,
        shipments,
        tradeDocuments,
        allRfqs,
        allShipments,
        allTradeDocuments,
        signInWithGoogle,
        signOutBuyer,
        saveNewRfqToFirestore,
        updateBuyerProfile,
        updateRfqDetails,
        appendShipmentNote,
        archiveTradeDocument,
        adminUpdateRfqStatus,
        adminUpdateShipmentStage,
        adminVerifyTradeDocument,
      }}
    >
      {children}
    </BuyerAuthContext.Provider>
  );
}

export function useBuyerAuth() {
  const ctx = useContext(BuyerAuthContext);
  if (!ctx) {
    throw new Error('useBuyerAuth must be used inside a BuyerAuthProvider');
  }
  return ctx;
}
