from __future__ import annotations

from dataclasses import dataclass
from typing import List, Dict

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


@dataclass
class KnowledgeChunk:
    topic: str
    title: str
    content: str


_chunks: List[KnowledgeChunk] = []
_vectorizer: TfidfVectorizer | None = None
_matrix = None
_trained = False


def _seed_corpus() -> List[KnowledgeChunk]:
    # Domain-oriented breast cancer knowledge base for chatbot guidance.
    return [
        KnowledgeChunk("overview", "What breast cancer is", "Breast cancer occurs when abnormal breast cells grow out of control and can form a tumor. It can start in ducts, lobules, or less commonly other breast tissues."),
        KnowledgeChunk("overview", "Common types", "Common types include ductal carcinoma in situ (DCIS), invasive ductal carcinoma, and invasive lobular carcinoma. Some cancers are hormone-receptor positive or HER2 positive."),
        KnowledgeChunk("symptoms", "Possible warning signs", "Warning signs can include a new breast lump, thickening, nipple discharge, nipple inversion, breast shape change, skin dimpling, or persistent breast pain."),
        KnowledgeChunk("symptoms", "When symptoms are absent", "Early breast cancer may have no symptoms. That is why screening mammography is important, especially for people in recommended age or risk groups."),
        KnowledgeChunk("screening", "Mammography role", "Mammography is the main screening tool for early detection. Screening schedules depend on age, personal risk, and local guideline recommendations."),
        KnowledgeChunk("screening", "Clinical and self awareness", "Breast self-awareness helps people notice new changes early. Clinical breast examinations can complement imaging depending on clinical context."),
        KnowledgeChunk("risk", "Major risk factors", "Risk factors include increasing age, inherited variants such as BRCA1/BRCA2, family history, dense breasts, prior chest radiation, obesity, alcohol use, and low physical activity."),
        KnowledgeChunk("risk", "Risk is not destiny", "Having risk factors does not mean a person will definitely develop breast cancer. Likewise, some people with no obvious risk factors can still develop it."),
        KnowledgeChunk("genetics", "Inherited mutations", "Inherited mutations in BRCA1, BRCA2, PALB2 and other genes can significantly increase risk. Genetic counseling helps decide who should consider testing."),
        KnowledgeChunk("genetics", "Who may benefit from counseling", "People with strong family history, early-onset cases, bilateral cancers, ovarian cancer in family, or male breast cancer history may benefit from genetic counseling."),
        KnowledgeChunk("diagnosis", "Diagnostic pathway", "Suspicious findings are usually evaluated with diagnostic imaging and, when indicated, biopsy. Pathology confirms diagnosis and tumor characteristics."),
        KnowledgeChunk("diagnosis", "Biopsy importance", "Biopsy determines whether tissue is benign or malignant and provides receptor status information such as ER, PR, and HER2."),
        KnowledgeChunk("staging", "Cancer staging", "Staging describes tumor size, lymph node involvement, and spread to distant organs. Stage guides treatment planning and prognosis discussions."),
        KnowledgeChunk("staging", "Stage examples", "Stage 0 is non-invasive disease like DCIS. Stages I to III are localized/regional invasive disease. Stage IV indicates metastatic disease."),
        KnowledgeChunk("treatment", "Treatment options overview", "Treatment may include surgery, radiation, chemotherapy, endocrine therapy, targeted therapy, or immunotherapy depending on subtype and stage."),
        KnowledgeChunk("treatment", "Surgery options", "Surgical approaches include lumpectomy (breast-conserving surgery) and mastectomy. Lymph node assessment may include sentinel node biopsy."),
        KnowledgeChunk("treatment", "Radiation therapy", "Radiation is often used after breast-conserving surgery and in selected other settings to reduce local recurrence risk."),
        KnowledgeChunk("treatment", "Chemotherapy role", "Chemotherapy may be given before surgery (neoadjuvant) or after surgery (adjuvant), depending on tumor biology and stage."),
        KnowledgeChunk("treatment", "Endocrine therapy", "Hormone receptor-positive cancers may be treated with endocrine therapy such as tamoxifen or aromatase inhibitors."),
        KnowledgeChunk("treatment", "Targeted therapy", "HER2-positive breast cancers may respond to HER2-targeted therapies. Selection depends on pathology and treatment setting."),
        KnowledgeChunk("side_effects", "Managing treatment side effects", "Common side effects can include fatigue, nausea, neuropathy, menopausal symptoms, and emotional stress. Early reporting helps teams adjust supportive care."),
        KnowledgeChunk("follow_up", "After treatment follow-up", "Survivorship care includes regular follow-up visits, symptom monitoring, adherence to therapy, and lifestyle support."),
        KnowledgeChunk("follow_up", "Recurrence awareness", "New persistent symptoms such as unexplained pain, weight loss, persistent cough, or new lumps should be discussed promptly with care teams."),
        KnowledgeChunk("prevention", "Risk reduction habits", "Healthy weight, regular exercise, limiting alcohol, avoiding smoking, and attending recommended screening can reduce risk and improve outcomes."),
        KnowledgeChunk("prevention", "High-risk prevention", "Some high-risk individuals may discuss enhanced screening, preventive medications, or risk-reducing surgery with specialists."),
        KnowledgeChunk("special_groups", "Breast cancer in men", "Breast cancer can also occur in men, though it is less common. New breast lumps, nipple changes, or discharge in men should be evaluated."),
        KnowledgeChunk("special_groups", "Pregnancy considerations", "Pregnancy-associated breast cancer requires specialist management balancing maternal treatment and fetal safety."),
        KnowledgeChunk("mental_health", "Emotional well-being", "Anxiety, depression, and uncertainty are common. Counseling, peer support groups, and psychosocial care can improve quality of life."),
        KnowledgeChunk("myths", "Myth: pain means no cancer", "Not all breast cancer is painful, and pain alone does not confirm cancer. Any persistent concerning change should be assessed."),
        KnowledgeChunk("myths", "Myth: only family history causes cancer", "Many people diagnosed with breast cancer have no family history. Screening and symptom awareness remain important for everyone."),
        KnowledgeChunk("urgent", "Urgent red flags", "Urgent evaluation is important for rapidly growing masses, skin ulceration, significant redness with swelling, or systemic symptoms with breast changes."),
        KnowledgeChunk("communication", "Doctor conversation tips", "Patients can prepare questions about diagnosis, stage, treatment goals, side effects, fertility, genetics, and expected timelines."),
        KnowledgeChunk("nutrition", "Nutrition during treatment", "Balanced nutrition with adequate protein and hydration helps support recovery. Individual plans may be needed for nausea or weight changes."),
        KnowledgeChunk("exercise", "Activity and recovery", "Light-to-moderate physical activity during and after treatment can reduce fatigue and improve quality of life when medically appropriate."),
        KnowledgeChunk("lifestyle", "Alcohol and risk", "Higher alcohol intake is associated with increased breast cancer risk. Reducing intake may help lower risk."),
        KnowledgeChunk("lifestyle", "Smoking and outcomes", "Smoking can worsen treatment outcomes and overall health. Smoking cessation support can be valuable at any stage."),
        KnowledgeChunk("pathology", "Receptor status meaning", "ER/PR positive means hormones can drive growth. HER2 positive means HER2 pathway is overactive. Triple-negative means ER, PR, and HER2 are all negative."),
        KnowledgeChunk("pathology", "Ki-67 and grade", "Tumor grade and proliferation markers like Ki-67 can help estimate aggressiveness and guide treatment planning."),
        KnowledgeChunk("imaging", "Ultrasound and MRI use", "Ultrasound can clarify findings and guide biopsy. MRI may be used in selected high-risk or complex diagnostic situations."),
        KnowledgeChunk("metastatic", "Metastatic disease principles", "Stage IV treatment often focuses on long-term disease control, symptom reduction, and quality of life with systemic therapies."),
        KnowledgeChunk("support", "Caregiver role", "Caregivers can support medication adherence, appointment coordination, emotional support, and communication with the care team."),
    ]


def train_chatbot() -> Dict:
    global _chunks, _vectorizer, _matrix, _trained
    _chunks = _seed_corpus()
    docs = [f"{c.topic} {c.title} {c.content}" for c in _chunks]
    _vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english", min_df=1)
    _matrix = _vectorizer.fit_transform(docs)
    _trained = True
    return {"trained": True, "chunks": len(_chunks)}


def is_trained() -> bool:
    return _trained and _vectorizer is not None and _matrix is not None


def _retrieve(query: str, top_k: int = 3):
    query_vec = _vectorizer.transform([query])
    sims = cosine_similarity(query_vec, _matrix)[0]
    top_idx = np.argsort(sims)[::-1][:top_k]
    results = []
    for idx in top_idx:
        if sims[idx] <= 0:
            continue
        c = _chunks[int(idx)]
        results.append({"topic": c.topic, "title": c.title, "content": c.content, "score": float(sims[idx])})
    return results


def chat(query: str, recent_messages: List[Dict] | None = None) -> Dict:
    if not is_trained():
        train_chatbot()

    recent_messages = recent_messages or []
    follow_up_hint = ""
    if recent_messages:
        last = recent_messages[0]
        follow_up_hint = f" You previously asked about: {last.get('question', '')[:120]}."

    retrieved = _retrieve(query, top_k=3)
    if not retrieved:
        return {
            "answer": (
                "I can help with breast cancer topics like symptoms, screening, diagnosis, staging, treatments, side effects, and follow-up care."
                + follow_up_hint
                + " Could you ask a more specific question so I can give targeted guidance?"
            ),
            "sources": ["breast_cancer_medical_knowledge_base"],
        }

    bullets = " ".join([f"{r['title']}: {r['content']}" for r in retrieved])
    answer = (
        "Here is a medically oriented response based on breast cancer guidance. "
        + bullets
        + " This information supports awareness and decision discussions, but diagnosis and treatment choices should be confirmed with a qualified oncology team."
    )
    return {
        "answer": answer,
        "sources": [r["title"] for r in retrieved],
        "topics": list({r["topic"] for r in retrieved}),
    }
