'use client';

import { useMemo, useState, useEffect } from 'react';
import { SubjectItem, ResourceItem } from '@/lib/dataFetcher';
import { useAcademicStore } from '@/store/academicStore';
import { cleanResourceTitle } from '@/lib/titleUtils';
import { 
  BookMarked, 
  Layers, 
  Search, 
  FileText, 
  ArrowRight, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Trophy, 
  Brain, 
  HelpCircle, 
  Clock, 
  BookOpen,  
  Cpu, 
  Database, 
  Activity, 
  CheckCircle2, 
  ChevronRight,
  Compass,
  Calendar
} from 'lucide-react';
import { logActivity } from '@/lib/activity';
import { NotesDisclaimer } from '@/components/NotesDisclaimer';
import { isSubjectMatch } from '@/lib/subjectMatcher';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';

interface SyllabusClientProps {
  subjects: SubjectItem[];
  branch: string;
  semester: number;
  syllabusUrl?: string | null;
  initialResources: ResourceItem[];
}

interface ResourceItemExt extends ResourceItem {
  subject_name: string;
}

const STORAGE_KEY = 'utility_syllabus_progress';

const AIDS_SEM_4_SUBJECTS = [
  {
    id: 'aid30010',
    code: 'AID30010',
    name: 'Data Engineering Techniques',
    type: 'PM',
    credits: 2,
    modules: [
      { title: 'Unit I: Data Engineering Basics & ETL', desc: 'Data Cleaning, Data Integration, ETL processes, Data Reduction, and Sampling techniques.' },
      { title: 'Unit II: Data Warehousing & OLAP', desc: 'Data Warehouse architecture, OLAP operations, Data Lakes, and Metadata management.' },
      { title: 'Unit III: Association Rule Mining', desc: 'Frequent itemsets, Apriori Algorithm, FP Growth, and industry Case Study analysis.' },
      { title: 'Unit IV: Supervised & Unsupervised Learning', desc: 'Decision Trees, Bayesian Classification, Clustering, and k-Means algorithm.' }
    ]
  },
  {
    id: 'aid30020',
    code: 'AID30020',
    name: 'Data Engineering Techniques Lab',
    type: 'PJ',
    credits: 1,
    modules: [
      { title: 'Data Ingestion & ETL Pipelines', desc: 'Hands-on ETL implementation using PowerBI and Python scripting.' },
      { title: 'OLAP & Warehousing Analytics', desc: 'Designing data warehouse schemas and performing multi-dimensional OLAP queries.' },
      { title: 'Advanced Visualization & BI', desc: 'Dashboard creation and interactive data storytelling with Tableau and PowerBI.' },
      { title: 'Big Data & Cloud Tooling', desc: 'Introduction to Databricks for large-scale data engineering and analytics workflows.' }
    ]
  },
  {
    id: 'aid30030',
    code: 'AID30030',
    name: 'Artificial Intelligence & Expert Systems',
    type: 'PM',
    credits: 2,
    modules: [
      { title: 'Introduction & Intelligent Agents', desc: 'Introduction to AI, foundational definitions, history, and Intelligent Agents architecture.' },
      { title: 'Search Techniques', desc: 'Uninformed search (BFS, DFS), Heuristic Search, and A* Algorithm problem solving.' },
      { title: 'Knowledge Representation', desc: 'Predicate Logic, Bayesian Networks, Neural Networks, and Fuzzy Logic systems.' },
      { title: 'Expert Systems & Applications', desc: 'Architecture of Expert Systems, rule-based reasoning, and practical decision frameworks.' }
    ]
  },
  {
    id: 'aid30040',
    code: 'AID30040',
    name: 'Artificial Intelligence & Expert Systems Lab',
    type: 'PJ',
    credits: 1,
    modules: [
      { title: 'Search Algorithms Implementation', desc: 'Coding BFS, DFS, and A* Search for complex graph and pathfinding problem solving.' },
      { title: 'Constraint Satisfaction & Games', desc: 'Implementing solutions for the 8 Puzzle Problem, N-Queens, and Sudoku Solver.' },
      { title: 'Adversarial Search', desc: 'Minimax Algorithm implementation for optimal two-player game AI strategy.' },
      { title: 'Mini Project', desc: 'End-to-end Face Recognition Mini Project implementation, training, and evaluation.' }
    ]
  },
  {
    id: 'aid20060',
    code: 'AID20060',
    name: 'Design & Analysis of Algorithms',
    type: 'PM',
    credits: 3,
    modules: [
      { title: 'Asymptotic Analysis & Divide and Conquer', desc: 'Asymptotic notation, Recurrence Relations, Quick Sort, Merge Sort analysis.' },
      { title: 'Greedy Algorithms & Graph Theory', desc: 'Greedy strategy principles, Prim’s, Kruskal’s, and Dijkstra’s shortest path algorithms.' },
      { title: 'Dynamic Programming', desc: 'Principles of DP, memoization, tabulation, and classic DP problem optimization.' },
      { title: 'Backtracking & Branch and Bound', desc: 'State space trees, N-Queens backtracking, and Knapsack branch & bound optimization.' },
      { title: 'Complexity Theory & Hashing', desc: 'P, NP, NP-Complete, NP-Hard complexity classes, and advanced Hashing Techniques.' }
    ]
  },
  {
    id: 'aid20070',
    code: 'AID20070',
    name: 'Project Based Learning II',
    type: 'PJ',
    credits: 1,
    modules: [
      { title: 'Ideation & Problem Formulation', desc: 'Identifying real-world problem statements, feasibility study, and literature review.' },
      { title: 'System Design & Architecture', desc: 'Architectural blueprinting, technology stack selection, and database schema design.' },
      { title: 'Implementation & Sprint I', desc: 'Core feature development, algorithmic module integration, and initial unit testing.' },
      { title: 'Final Evaluation & Presentation', desc: 'Project deployment, rigorous user testing, technical report writing, and viva voce.' }
    ]
  }
];

function getModulesForSubject(name: string) {
  const upper = name.toUpperCase();
  if (upper.includes('DATA STRUCTURE') || upper.includes('DSA')) {
    return [
      { title: 'Arrays, Strings & Linked Lists', desc: 'Memory allocation, pointer manipulation, singly and doubly linked lists, and basic operations.' },
      { title: 'Stacks & Queues', desc: 'LIFO and FIFO principles, circular queues, priority queues, and application in parsing.' },
      { title: 'Trees & Graphs', desc: 'Binary search trees, AVL trees, graph representations, BFS, DFS, and spanning trees.' },
      { title: 'Sorting & Searching', desc: 'Comparison-based sorting (Quick, Merge, Heap), linear/binary search, and hashing.' },
      { title: 'Advanced Data Structures', desc: 'Tries, B-Trees, Fibonacci heaps, and disjoint set data structures.' }
    ];
  }
  if (upper.includes('DIGITAL ELECTRONICS') || upper === 'DE') {
    return [
      { title: 'Unit I: Number Systems & Boolean Algebra', desc: 'Binary codes, Boolean minimization using K-maps and Quine-McCluskey method, and logic gate implementation.' },
      { title: 'Unit II: Combinational Logic Design', desc: 'Design of adders, subtractors, code converters, decoders, encoders, multiplexers, and demultiplexers.' },
      { title: 'Unit III: Sequential Logic Design', desc: 'Latches, flip-flops (SR, JK, D, T), excitation tables, shift registers, and design of synchronous/asynchronous counters.' },
      { title: 'Unit IV: Finite State Machines & Logic Families', desc: 'State diagrams, state reduction, Mealy and Moore models, and TTL/CMOS logic families.' }
    ];
  }
  if (upper.includes('SIGNALS') || upper === 'SS') {
    return [
      { title: 'Unit I: Classification of Signals & Systems', desc: 'Continuous-time and discrete-time signals, operations on signals, and system properties (causality, linearity, time-invariance).' },
      { title: 'Unit II: Linear Time-Invariant Systems & Convolution', desc: 'Impulse response, convolution integral and sum, and LTI system properties in time domain.' },
      { title: 'Unit III: Fourier Analysis', desc: 'Continuous-Time Fourier Transform (CTFT), Discrete-Time Fourier Transform (DTFT), properties, and frequency response.' },
      { title: 'Unit IV: Laplace & Z-Transforms', desc: 'Laplace transform, Z-transform, Region of Convergence (ROC), properties, inverse transforms, and LTI system analysis.' }
    ];
  }
  if (upper.includes('ELECTRONIC DEVICES') || upper === 'EDC') {
    return [
      { title: 'Unit I: Semiconductor Diodes & Special Devices', desc: 'PN junction diode, Zener diode, Varactor diode, BJT structure/characteristics, and MOSFET structure/characteristics.' },
      { title: 'Unit II: MOSFET DC Analysis & Biasing', desc: 'MOSFET DC biasing configurations, load lines, and bias stability analysis.' },
      { title: 'Unit III: MOSFET AC Analysis & Amplifiers', desc: 'MOSFET small-signal model, Common Source, Common Gate, and Common Drain amplifier configurations.' },
      { title: 'Unit IV: Feedback Amplifiers & Oscillators', desc: 'Feedback concepts, feedback topologies (voltage/current, series/shunt), and Barkhausen criterion for oscillators.' }
    ];
  }
  if (upper.includes('CALCULUS') || upper === 'CSM') {
    return [
      { title: 'Unit I: Vector Calculus', desc: 'Gradient, divergence, curl, line integrals, surface integrals, volume integrals, and Green’s, Stokes’, and Divergence theorems.' },
      { title: 'Unit II: Multiple Integrals & Applications', desc: 'Double and triple integrals, change of variables, jacobians, area, and volume calculation.' },
      { title: 'Unit III: Probability Distributions', desc: 'Random variables, probability mass/density functions, mathematical expectation, Binomial, Poisson, and Normal distributions.' },
      { title: 'Unit IV: Statistical Inference & Hypothesis Testing', desc: 'Sampling distributions, central limit theorem, testing of hypothesis (Z-test, t-test, Chi-square test), and confidence intervals.' }
    ];
  }
  if (upper.includes('PEACE') || upper.includes('SCIENCE, RELIGION') || upper === 'SRS' || upper === 'PEACE') {
    return [
      { title: 'Unit I: Science and Spirituality Integration', desc: 'Methods of science vs methods of religion, philosophy of science, and synthesis of science and spirituality.' },
      { title: 'Unit II: Human Values & Ethics', desc: 'Truth, right conduct, peace, love, non-violence, professional ethics, and moral development models.' },
      { title: 'Unit III: World Religions & Spiritual Philosophies', desc: 'Core teachings of major world religions, common values, and inter-religious dialogue for peace.' },
      { title: 'Unit IV: Mind, Consciousness & Well-being', desc: 'Stress management, mindfulness, meditation, spiritual practices, and holistic health and wellness.' }
    ];
  }
  if (upper.includes('DATABASE') || upper.includes('DBMS')) {
    return [
      { title: 'Introduction & ER Modeling', desc: 'Database architecture, entity-relationship diagrams, relational models, and schema design.' },
      { title: 'Relational Algebra & SQL', desc: 'Selection, projection, joins, complex SQL queries, views, and triggers.' },
      { title: 'Normalization & Schema Refinement', desc: 'Functional dependencies, 1NF, 2NF, 3NF, BCNF, and lossless decomposition.' },
      { title: 'Transaction Management & Concurrency', desc: 'ACID properties, serializability, two-phase locking, and deadlock handling.' },
      { title: 'Indexing & Storage', desc: 'B+ trees, hash indexing, query processing, and query optimization techniques.' }
    ];
  }
  if (upper.includes('OPERATING SYSTEM') || upper.includes('OS')) {
    return [
      { title: 'OS Structures & Process Management', desc: 'System calls, process states, PCB, context switching, and inter-process communication.' },
      { title: 'CPU Scheduling & Threads', desc: 'System calls, CPU scheduling (FCFS, SJF, RR, Multilevel), and multithreading.' },
      { title: 'Process Synchronization & Deadlocks', desc: 'Critical section problem, semaphores, mutexes, dining philosophers, and deadlock avoidance.' },
      { title: 'Memory Management & Virtual Memory', desc: 'Paging, segmentation, TLB, demand paging, and page replacement (FIFO, LRU, Optimal).' },
      { title: 'File Systems & I/O Management', desc: 'File allocation, directory structures, disk scheduling, and kernel I/O subsystem.' }
    ];
  }
  if (upper.includes('NETWORK') || upper.includes('CN')) {
    return [
      { title: 'Network Models & Physical Layer', desc: 'OSI and TCP/IP reference models, transmission media, switching, and multiplexing techniques.' },
      { title: 'Data Link Layer & LANs', desc: 'Framing, error detection/correction (CRC), MAC protocols (CSMA/CD, CSMA/CA), and Ethernet.' },
      { title: 'Network Layer & Routing', desc: 'IPv4/IPv6 addressing, subnetting, routing algorithms (Distance Vector, Link State), and ICMP/ARP.' },
      { title: 'Transport Layer Protocols', desc: 'UDP, TCP connection management, flow control, congestion control, and socket programming.' },
      { title: 'Application Layer & Security', desc: 'DNS, HTTP, FTP, SMTP, cryptography basics, SSL/TLS, and network security protocols.' }
    ];
  }
  if (upper.includes('ANALOG CIRCUITS') || upper === 'ACA') {
    return [
      { title: 'Unit I: MOSFET Characteristics & DC Analysis', desc: 'MOSFET DC analysis, biasing circuits, and load line configuration.' },
      { title: 'Unit II: Amplifiers & Feedback Systems', desc: 'MOSFET AC analysis, differential amplifiers, and feedback topologies.' },
      { title: 'Unit III: Operational Amplifiers (Op-Amps)', desc: 'Linear and non-linear Op-Amp applications, summing amplifiers, and frequency response.' },
      { title: 'Unit IV: Data Converters (DAC & ADC)', desc: 'Weighted binary DAC, R-2R ladder, Flash ADC, and Successive Approximation Register (SAR) ADC.' }
    ];
  }
  if (upper.includes('COMMUNICATION SYSTEMS') || upper === 'COS') {
    return [
      { title: 'Unit I: Amplitude Modulation (AM)', desc: 'Double sideband, single sideband, vestigial sideband transmission, and AM demodulators.' },
      { title: 'Unit II: Angle Modulation (FM & PM)', desc: 'Frequency modulation, phase modulation, narrow-band FM, wide-band FM, and demodulation techniques.' },
      { title: 'Unit III: Random Processes & Noise', desc: 'Probability theory, random variables, stationary processes, power spectral density, and noise in modulation.' },
      { title: 'Unit IV: Pulse & Digital Modulation', desc: 'Sampling theorem, PAM, PWM, PPM, and introduction to digital encoding schemes.' }
    ];
  }
  if (upper.includes('CONTROL SYSTEMS') || upper === 'CSFL') {
    return [
      { title: 'Unit I: Control Systems & Modeling', desc: 'Mathematical modeling of physical systems, transfer functions, and block diagram reduction.' },
      { title: 'Unit II: Time Domain Analysis & Stability', desc: 'Transient and steady-state response, Routh-Hurwitz stability criterion, and Root Locus techniques.' },
      { title: 'Unit III: Frequency Domain Analysis', desc: 'Bode plots, Nyquist stability criterion, polar plots, and design of compensators.' },
      { title: 'Unit IV: Fuzzy Logic Controllers', desc: 'Fuzzy sets, membership functions, fuzzification, fuzzy rules, defuzzification, and controller applications.' }
    ];
  }
  if (upper.includes('MICROCONTROLLER') || upper === 'MA') {
    return [
      { title: 'Unit I: 8051 Microcontroller Architecture', desc: 'Pin diagram, internal memory organization, register banks, SFRs, and addressing modes.' },
      { title: 'Unit II: Programming & Instruction Set', desc: 'Assembly language programming, data transfer, arithmetic and logical instructions, and I/O programming.' },
      { title: 'Unit III: Hardware & Peripheral Interfacing', desc: 'Interfacing displays (LCD, 7-Segment), keyboards, ADCs/DACs, and DC/Stepper motors.' },
      { title: 'Unit IV: Timers, Interrupts & Serial Communication', desc: 'Timer/Counter programming, external interrupts, serial port programming, and RS-232 standards.' }
    ];
  }
  return [
    { title: 'Unit I: Core Principles & Theoretical Foundations', desc: 'Fundamental definitions, historical context, underlying mathematical models, and primary architectural concepts.' },
    { title: 'Unit II: Operational Workflows & System Mechanisms', desc: 'Detailed structural breakdown, core operational workflows, intermediate theorems, and standard analytical methodologies.' },
    { title: 'Unit III: Advanced Methodologies & Subsystem Design', desc: 'In-depth exploration of complex subsystems, advanced algorithmic approaches, and structural optimization techniques.' },
    { title: 'Unit IV: Industry Implementation & Practical Applications', desc: 'Real-world case studies, contemporary industry tooling, practical project synthesis, and comprehensive performance evaluation.' }
  ];
}

export default function SyllabusClient({ subjects, branch, semester, syllabusUrl, initialResources }: SyllabusClientProps) {
  const { searchQuery } = useAcademicStore();
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, boolean | string>>({});
  const [mounted, setMounted] = useState(false);
  const resources = initialResources as ResourceItemExt[];

  // Scheduler Modal State
  const [plannerModalOpen, setPlannerModalOpen] = useState(false);
  const [schedulingModule, setSchedulingModule] = useState<{ subjectName: string; moduleTitle: string } | null>(null);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleCategory, setScheduleCategory] = useState('Revision');
  const [scheduleTitle, setScheduleTitle] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setProgressMap(JSON.parse(saved));
      }
    } catch {}
    setMounted(true);
  }, []);

  const getMatchingResources = (
    moduleTitle: string,
    moduleDesc: string,
    subjectName: string
  ) => {
    const subjectResources = resources.filter(
      r => isSubjectMatch(r.subject_name, subjectName)
    );
    
    const pool = subjectResources;
    if (pool.length === 0) return [];
    
    const titleWords = moduleTitle.toLowerCase()
      .replace(/unit\s+[ivx]+/gi, '')
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);
      
    const descWords = moduleDesc.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);
      
    const keywords = Array.from(new Set([...titleWords, ...descWords]));
    
    const scored = pool.map(resource => {
      const rTitle = resource.title.toLowerCase();
      let score = 0;
      keywords.forEach(word => {
        if (rTitle.includes(word)) {
          score += 1;
        }
      });
      return { resource, score };
    });
    
    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.resource)
      .slice(0, 3);
  };

  const updateModuleStatus = (subjectId: string, moduleIdx: number, status: 'not-started' | 'in-progress' | 'mastered') => {
    const key = `${subjectId}_${moduleIdx}`;
    setProgressMap((prev) => {
      const updated = { ...prev, [key]: status };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      if (status === 'mastered') {
        logActivity('syllabus_module_completed', 1);
      }
      return updated;
    });
  };

  const handleScheduleTask = async () => {
    if (!schedulingModule) return;

    const dateParts = scheduleDate.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]);

    const taskText = scheduleTitle || `Study: ${schedulingModule.subjectName} - ${schedulingModule.moduleTitle}`;
    
    const newTask = {
      id: Math.random().toString(36).slice(2, 11),
      text: taskText,
      done: false,
      subtasks: [],
      category: scheduleCategory
    };

    const key = `utility_planner_v2_${year}_${month}`;
    let planData: Record<string, any[]> = {};
    let planMeta = { title: 'Study Plan', month, year, is_public: false };

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        planData = parsed.data || {};
        planMeta = parsed.meta || planMeta;
      }
    } catch (e) {
      console.error(e);
    }

    if (!planData[scheduleDate]) {
      planData[scheduleDate] = [];
    }
    planData[scheduleDate].push(newTask);

    localStorage.setItem(key, JSON.stringify({ data: planData, meta: planMeta }));
    toast.success(`Scheduled task on ${scheduleDate}!`);

    const user = auth.currentUser;
    if (user) {
      try {
        const q = query(
          collection(db, 'planner_plans'),
          where('owner_id', '==', user.uid),
          where('month', '==', month),
          where('year', '==', year)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const docId = snapshot.docs[0].id;
          await updateDoc(doc(db, 'planner_plans', docId), {
            data: planData,
            updated_at: new Date().toISOString()
          });
        } else {
          const newDocRef = doc(collection(db, 'planner_plans'));
          await setDoc(newDocRef, {
            owner_id: user.uid,
            owner_email: user.email,
            title: planMeta.title,
            month,
            year,
            data: planData,
            is_public: false,
            updated_at: new Date().toISOString()
          });
        }
        toast.success('Synced to Cloud Planner');
      } catch (err) {
        console.error('Firebase sync error:', err);
      }
    }

    setPlannerModalOpen(false);
    setSchedulingModule(null);
  };

  // Merge DB subjects with official syllabus subjects if AIDS Sem 4
  const displaySubjects = useMemo(() => {
    if (branch === 'AIDS' && semester === 4) {
      return AIDS_SEM_4_SUBJECTS.map((officialSub) => {
        const dbSub = subjects.find(s => isSubjectMatch(s.name, officialSub.name));
        return {
          id: dbSub ? dbSub.id : officialSub.id,
          name: officialSub.name,
          branch: 'AIDS',
          semester: 4,
          code: officialSub.code,
          type: officialSub.type,
          credits: officialSub.credits,
          modules: officialSub.modules,
        };
      });
    }

    // For other branches/semesters, use DB subjects but attach realistic modules
    return subjects.map((sub) => {
      const modules = getModulesForSubject(sub.name);
      return {
        ...sub,
        code: `SUB-${sub.id.substring(0, 4).toUpperCase()}`,
        type: 'PM',
        credits: 3,
        modules,
      };
    });
  }, [subjects, branch, semester]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return displaySubjects;
    const q = searchQuery.toLowerCase();
    return displaySubjects.filter(
      (s) => s.name.toLowerCase().includes(q) || 
             s.code.toLowerCase().includes(q) || 
             isSubjectMatch(s.name, searchQuery)
    );
  }, [displaySubjects, searchQuery]);

  // Calculate Overall Progress
  const totalModules = filtered.reduce((acc, sub) => acc + sub.modules.length, 0);
  const completedModules = useMemo(() => {
    if (filtered.length === 0) return 0;
    return filtered.reduce((acc, sub) => {
      const subDone = sub.modules.reduce((sum, _, idx) => {
        const val = progressMap[`${sub.id}_${idx}`];
        if (val === 'mastered' || val === true) return sum + 1;
        if (val === 'in-progress') return sum + 0.5;
        return sum;
      }, 0);
      return acc + subDone;
    }, 0);
  }, [filtered, progressMap]);

  const overallPercentage = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
  const estimatedHoursLeft = Math.max(0, Math.round((totalModules - completedModules) * 3));

  const getSubjectIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('artificial intelligence') || n.includes('expert systems') || n.includes('ai')) return Brain;
    if (n.includes('data engineering') || n.includes('database') || n.includes('dbms')) return Database;
    if (n.includes('algorithm') || n.includes('daa') || n.includes('data structure') || n.includes('dsa')) return Cpu;
    if (n.includes('project') || n.includes('pbl') || n.includes('lab')) return Activity;
    if (n.includes('german')) return Compass;
    return BookOpen;
  };

  if (!mounted) {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 flex justify-center items-center h-[50vh]">
        <span className="text-sm font-semibold text-muted">Initializing dashboard...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 min-h-[90vh] relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-border pb-6 relative z-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Syllabus
          </h1>
          <p className="text-foreground-subtle text-sm mt-1.5">
            {branch} · Semester {semester} · {filtered.length} course{filtered.length !== 1 ? 's' : ''}
          </p>
          <NotesDisclaimer compact className="mt-3 max-w-xl" />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {syllabusUrl && (
            <a
              href={syllabusUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-foreground text-background text-sm font-medium hover:opacity-90 rounded-lg transition-opacity shrink-0"
            >
              <FileText className="w-4 h-4" />
              Download PDF
            </a>
          )}
        </div>
      </div>

      {/* Progress */}
      {filtered.length > 0 && (
        <div className="border border-border p-5 mb-10 rounded-lg flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 bg-card">
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Semester progress</h3>
              <div className="flex flex-wrap gap-4 text-xs text-muted font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-foreground" />
                  {completedModules} / {totalModules} units done
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-muted-hover" />
                  ~{estimatedHoursLeft} Hours Study Left
                </span>
              </div>
            </div>
          </div>

          <div className="w-full md:w-80 flex flex-col gap-2 shrink-0">
            <div className="flex justify-between items-end text-xs font-bold">
              <span className="text-muted-foreground">Overall Completion</span>
              <span className="text-primary text-sm font-extrabold">{overallPercentage}%</span>
            </div>
            <div className="h-4 w-full bg-surface border border-border p-0.5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallPercentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-foreground rounded-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Subject Cards List */}
      <div className="flex flex-col gap-px bg-border/60 rounded-xl overflow-hidden border border-border/70 shadow-sm relative z-10">
        <AnimatePresence mode="popLayout">
          {filtered.map((subject, i) => {
            const isExpanded = expandedSubject === subject.id;
            const subCompleted = subject.modules.reduce((sum, _, idx) => {
              const val = progressMap[`${subject.id}_${idx}`];
              if (val === 'mastered' || val === true) return sum + 1;
              if (val === 'in-progress') return sum + 0.5;
              return sum;
            }, 0);
            const masteredCount = subject.modules.filter((_, idx) => progressMap[`${subject.id}_${idx}`] === 'mastered' || progressMap[`${subject.id}_${idx}`] === true).length;
            const inProgressCount = subject.modules.filter((_, idx) => progressMap[`${subject.id}_${idx}`] === 'in-progress').length;
            const subPercentage = subject.modules.length > 0 ? Math.round((subCompleted / subject.modules.length) * 100) : 0;
            const SubjectIcon = getSubjectIcon(subject.name);

            return (
              <motion.div
                key={subject.id}
                layout="position"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`bg-card transition-all overflow-hidden ${
                  isExpanded 
                    ? 'shadow-md relative z-20 border-y border-border-strong' 
                    : 'hover:bg-surface/30'
                }`}
              >
                {/* Subject Header */}
                <div
                  onClick={() => setExpandedSubject(isExpanded ? null : subject.id)}
                  className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-12 h-12 flex items-center justify-center shrink-0 border rounded-xl transition-all duration-300 ${
                      isExpanded 
                        ? 'bg-foreground border-foreground text-background shadow-md scale-105' 
                        : 'bg-surface/80 border-border text-foreground group-hover:border-foreground/45 group-hover:bg-card'
                    }`}>
                      <SubjectIcon className="w-6 h-6" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-foreground tracking-tight truncate max-w-[280px] sm:max-w-md">
                          {subject.name}
                        </h2>
                        <span className="text-[10px] font-mono font-bold text-foreground bg-foreground/10 border border-foreground/20 px-2.5 py-0.5 rounded-lg shrink-0">
                          {subject.code}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground bg-surface border border-border px-2 py-0.5 rounded-lg shrink-0">
                          {subject.type} · {subject.credits} CR
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-semibold">
                        Syllabus Tracker Core Modules
                      </p>
                    </div>
                  </div>

                  {/* Progress Indicator & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-4 sm:pt-0 border-border/40 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-foreground block leading-tight">{subPercentage}%</span>
                        <span className="text-[10px] text-muted-foreground font-bold">{masteredCount} Mastered {inProgressCount > 0 && `· ${inProgressCount} IP`}</span>
                      </div>
                      
                      {/* Apple Watch Style SVG Progress Ring */}
                      <div className="relative w-10 h-10 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <circle
                            cx="18"
                            cy="18"
                            r="15.915"
                            className="stroke-surface"
                            strokeWidth="4"
                            fill="none"
                          />
                          <circle
                            cx="18"
                            cy="18"
                            r="15.915"
                            className="stroke-foreground transition-all duration-500"
                            strokeWidth="4"
                            strokeDasharray={`${subPercentage}, 100`}
                            strokeLinecap="round"
                            fill="none"
                            style={{
                              filter: subPercentage > 0 ? 'drop-shadow(0 0 3px rgb(var(--foreground) / 0.2))' : 'none'
                            }}
                          />
                        </svg>
                        {subPercentage === 100 && (
                          <Check className="w-4 h-4 text-foreground absolute stroke-[3]" />
                        )}
                      </div>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-all shrink-0">
                      {isExpanded ? <ChevronUp className="w-4.5 h-4.5" /> : <ChevronDown className="w-4.5 h-4.5" />}
                    </div>
                  </div>
                </div>

                {/* Collapsible Subject Modules */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="border-t border-border/50 bg-surface/10"
                    >
                      <div className="p-6 space-y-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                          <BookOpen className="w-3.5 h-3.5 text-foreground" />
                          Curriculum Units
                        </div>

                        <div className="space-y-3.5">
                          {subject.modules.map((mod, modIdx) => {
                            const currentVal = progressMap[`${subject.id}_${modIdx}`];
                            const isDone = currentVal === 'mastered' || currentVal === true;
                            const isInProgress = currentVal === 'in-progress';
                            const matches = getMatchingResources(mod.title, mod.desc, subject.name);

                            return (
                              <div
                                key={modIdx}
                                className={`flex flex-col p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                                  isDone
                                    ? 'bg-foreground/[0.02] dark:bg-foreground/[0.03] border-foreground/35 text-foreground shadow-xs'
                                    : isInProgress
                                    ? 'bg-foreground/[0.01] dark:bg-foreground/[0.015] border-foreground/60 text-foreground shadow-3xs'
                                    : 'bg-card border-border/85 hover:border-foreground/35 hover:scale-[1.005] hover:shadow-sm text-foreground'
                                }`}
                              >
                                <div className="flex items-start gap-4 z-10">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const next = isDone
                                        ? 'not-started'
                                        : isInProgress
                                        ? 'mastered'
                                        : 'in-progress';
                                      updateModuleStatus(subject.id, modIdx, next);
                                    }}
                                    className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 hover:scale-110 active:scale-90 transition-all duration-200 ${
                                      isDone 
                                        ? 'bg-foreground border-foreground text-background shadow-sm' 
                                        : isInProgress
                                        ? 'bg-foreground/75 border-foreground/75 text-background shadow-xs'
                                        : 'bg-surface border-border hover:border-foreground/40 text-transparent'
                                    }`}
                                  >
                                    {isDone ? (
                                      <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                                    ) : isInProgress ? (
                                      <span className="text-[11px] font-black leading-none">-</span>
                                    ) : null}
                                  </button>

                                  <div className="min-w-0 flex-1 space-y-1">
                                    <h5 className={`text-base font-bold leading-snug tracking-tight ${isDone ? 'line-through opacity-75' : ''}`}>
                                      {mod.title}
                                    </h5>
                                    <p className={`text-xs leading-relaxed font-medium ${isDone ? 'text-muted-foreground opacity-70' : 'text-muted-foreground'}`}>
                                      {mod.desc}
                                    </p>
                                  </div>
                                </div>

                                {/* Study resources pill cards */}
                                {matches.length > 0 && (
                                  <div 
                                    className="mt-4 flex flex-wrap gap-2.5 items-center pl-10 z-10" 
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span className="text-[9px] text-muted-foreground font-extrabold uppercase tracking-widest">Vault Files:</span>
                                    {matches.map(file => (
                                      <a
                                        key={file.id}
                                        href={file.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-surface/50 hover:bg-surface hover:border-foreground/30 border border-border/80 px-3 py-1.5 rounded-xl text-foreground transition-all shadow-3xs hover:-translate-y-0.5"
                                      >
                                        <FileText className="w-3.5 h-3.5 text-foreground/70" />
                                        <span className="truncate max-w-[150px]" title={file.title}>
                                          {cleanResourceTitle(file.title)}
                                        </span>
                                      </a>
                                    ))}
                                  </div>
                                )}

                                {/* Status Selector Pills & Actions */}
                                <div 
                                  className="mt-4 pt-3.5 border-t border-border/40 flex flex-wrap items-center justify-between gap-3 pl-10 z-10" 
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center gap-1.5 bg-surface/50 border border-border/40 p-0.5 rounded-xl">
                                    {(['not-started', 'in-progress', 'mastered'] as const).map((s) => {
                                      const active = s === 'mastered' ? isDone : (s === 'in-progress' ? isInProgress : (!isDone && !isInProgress));
                                      return (
                                        <button
                                          key={s}
                                          onClick={() => updateModuleStatus(subject.id, modIdx, s)}
                                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                                            active
                                              ? s === 'mastered'
                                                ? 'bg-foreground text-background shadow-xs'
                                                : s === 'in-progress'
                                                ? 'bg-foreground/75 text-background shadow-xs'
                                                : 'bg-muted text-background'
                                              : 'text-muted hover:text-foreground'
                                          }`}
                                        >
                                          {s === 'not-started' ? 'To Do' : s === 'in-progress' ? 'In Progress' : 'Mastered'}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      onClick={() => {
                                        setSchedulingModule({ subjectName: subject.name, moduleTitle: mod.title });
                                        setScheduleTitle(`Study: ${subject.name} - ${mod.title}`);
                                        setPlannerModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground bg-surface hover:bg-surface-hover border border-border hover:border-foreground/30 px-3 py-1.5 rounded-xl transition-all shadow-3xs hover:-translate-y-0.5 active:scale-95"
                                      title="Schedule in Planner"
                                    >
                                      <Calendar className="w-3.5 h-3.5 text-foreground/80 shrink-0" />
                                      Schedule
                                    </button>
                                    <a
                                      href={`/ask?tab=chat&prompt=${encodeURIComponent(`Create a detailed study guide explaining this syllabus topic: "${subject.name} - ${mod.title}". Focus on: ${mod.desc}`)}`}
                                      className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground bg-surface hover:bg-surface-hover border border-border hover:border-foreground/30 px-3 py-1.5 rounded-xl transition-all shadow-3xs hover:-translate-y-0.5 active:scale-95"
                                    >
                                      <Brain className="w-3.5 h-3.5 text-foreground/80 shrink-0" />
                                      Guide
                                    </a>
                                    <a
                                      href={`/ask?tab=flashcards&topic=${encodeURIComponent(`${subject.name} - ${mod.title}`)}&auto=true`}
                                      className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground bg-surface hover:bg-surface-hover border border-border hover:border-foreground/30 px-3 py-1.5 rounded-xl transition-all shadow-3xs hover:-translate-y-0.5 active:scale-95"
                                    >
                                      <Layers className="w-3.5 h-3.5 text-foreground/80 shrink-0" />
                                      Cards
                                    </a>
                                    <a
                                      href={`/ask?tab=quiz&topic=${encodeURIComponent(`${subject.name} - ${mod.title}`)}&auto=true`}
                                      className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground bg-surface hover:bg-surface-hover border border-border hover:border-foreground/30 px-3 py-1.5 rounded-xl transition-all shadow-3xs hover:-translate-y-0.5 active:scale-95"
                                    >
                                      <HelpCircle className="w-3.5 h-3.5 text-foreground/80 shrink-0" />
                                      Quiz
                                    </a>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Subject Card Footer */}
                        <div className="pt-4 flex items-center justify-between border-t border-border/40 mt-6 pl-1">
                          <span className="text-xs text-muted-foreground italic font-medium">Click any unit block to log completion progress.</span>
                          <a
                            href={`/ask?topic=${encodeURIComponent(subject.name)}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-foreground hover:underline hover:gap-1.5 transition-all"
                          >
                            Query AI on Subject
                            <ChevronRight className="w-4.5 h-4.5 text-foreground" />
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty states */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center p-20 text-center border-2 border-dashed border-border/80 rounded-2xl bg-card my-12 relative z-10">
          <BookMarked className="w-12 h-12 text-muted-foreground/30 mb-4 animate-bounce" />
          <p className="text-lg font-bold text-foreground mb-1">No matching courses found</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            {searchQuery 
              ? `We couldn't find any subjects matching "${searchQuery}". Please check your search query.`
              : `No curriculum subjects are populated for ${branch} Semester ${semester} in the database.`}
          </p>
        </div>
      )}

      {/* Global Navigation Link to Resource Vault */}
      {filtered.length > 0 && (
        <div className="mt-14 flex justify-center relative z-10">
          <a
            href={`/resources?branch=${branch}&semester=${semester}`}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-surface border border-border/80 hover:border-border-strong hover:bg-surface-hover text-sm font-bold text-muted-foreground hover:text-foreground transition-all group shadow-sm hover:scale-[1.01]"
          >
            <Layers className="w-4 h-4 text-primary" />
            Open Study Resource Vault
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1.5 transition-all" />
          </a>
        </div>
      )}
      {/* Add to Planner Scheduler Modal */}
      <AnimatePresence>
        {plannerModalOpen && schedulingModule && (
          <div
            onClick={() => {
              setPlannerModalOpen(false);
              setSchedulingModule(null);
            }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/95"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card border border-border rounded-2xl shadow-popover overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Schedule Study Session
                </h3>
                <button
                  onClick={() => {
                    setPlannerModalOpen(false);
                    setSchedulingModule(null);
                  }}
                  className="text-muted hover:text-foreground text-sm font-semibold"
                >
                  Close
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Task Title</label>
                  <input
                    type="text"
                    value={scheduleTitle}
                    onChange={(e) => setScheduleTitle(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-foreground font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Date</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-foreground"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Category</label>
                    <select
                      value={scheduleCategory}
                      onChange={(e) => setScheduleCategory(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-foreground"
                    >
                      <option value="Revision">Revision</option>
                      <option value="Exam Prep">Exam Prep</option>
                      <option value="Assignment">Assignment</option>
                      <option value="Project">Project</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-surface border-t border-border flex justify-end gap-2">
                <button
                  onClick={() => {
                    setPlannerModalOpen(false);
                    setSchedulingModule(null);
                  }}
                  className="px-4 py-2 border border-border hover:bg-surface-hover text-xs font-semibold rounded-xl text-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleTask}
                  className="px-4 py-2 bg-foreground text-background hover:opacity-90 text-xs font-bold rounded-xl shadow-md"
                >
                  Schedule Task
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
