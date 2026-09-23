"""
Integration Tests for Knowledge Base System
Tests the complete workflow: upload → parse → vectorize → search
"""

import os
import sys
import pytest
import requests
from pathlib import Path

# Add backend directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from services.knowledge_service import KnowledgeService
from services.nlp_service import NLPService
from config.qdrant_config import get_qdrant_client

# Test configuration
BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:5000")
TEST_KB_NAME = "test_integration_kb"
TEST_FILES_DIR = Path(__file__).parent / "test_files"


class TestDocumentProcessingWorkflow:
    """Test complete document processing workflow"""

    @classmethod
    def setup_class(cls):
        """Setup test environment"""
        cls.knowledge_service = KnowledgeService()
        cls.nlp_service = NLPService()
        cls.qdrant_client = get_qdrant_client()

        # Create test knowledge base
        cls.kb_id = cls.knowledge_service.create_knowledge_base(
            name=TEST_KB_NAME,
            description="Integration test knowledge base"
        )

    @classmethod
    def teardown_class(cls):
        """Cleanup test environment"""
        try:
            # Delete test knowledge base
            cls.knowledge_service.delete_knowledge_base(cls.kb_id)
        except Exception as e:
            print(f"Cleanup error: {e}")

    def test_01_document_upload_and_parse(self):
        """Test document upload and parsing"""
        # Create a test document
        test_content = """
        糖尿病的诊断标准

        1. 空腹血糖 ≥ 7.0 mmol/L
        2. 餐后2小时血糖 ≥ 11.1 mmol/L
        3. 糖化血红蛋白 ≥ 6.5%

        常见症状：多饮、多尿、多食、体重下降
        """

        test_file_path = TEST_FILES_DIR / "test_diabetes.txt"
        test_file_path.parent.mkdir(exist_ok=True)
        test_file_path.write_text(test_content, encoding="utf-8")

        # Upload document
        result = self.knowledge_service.upload_document(
            kb_id=self.kb_id,
            file_path=str(test_file_path),
            filename="test_diabetes.txt"
        )

        assert result["success"] is True
        assert "doc_id" in result
        self.doc_id = result["doc_id"]

        # Verify document was parsed
        doc_info = self.knowledge_service.get_document_info(self.doc_id)
        assert doc_info is not None
        assert doc_info["status"] == "completed"
        assert doc_info["chunk_count"] > 0

    def test_02_vectorization_workflow(self):
        """Test document vectorization"""
        # Get document chunks
        chunks = self.knowledge_service.get_document_chunks(self.doc_id)
        assert len(chunks) > 0

        # Verify vectors were created in Qdrant
        collection_name = f"kb_{self.kb_id}"
        collection_info = self.qdrant_client.get_collection(collection_name)
        assert collection_info.points_count > 0

    def test_03_hybrid_search_semantic(self):
        """Test semantic search mode"""
        query = "糖尿病的诊断方法"

        results = self.knowledge_service.search(
            kb_id=self.kb_id,
            query=query,
            search_mode="semantic",
            top_k=5
        )

        assert len(results) > 0
        assert "score" in results[0]
        assert "content" in results[0]
        assert results[0]["score"] > 0.5  # Should have decent similarity

    def test_04_hybrid_search_keyword(self):
        """Test keyword search mode"""
        query = "空腹血糖"

        results = self.knowledge_service.search(
            kb_id=self.kb_id,
            query=query,
            search_mode="keyword",
            top_k=5
        )

        assert len(results) > 0
        # Keyword search should find exact matches
        assert any("空腹血糖" in r["content"] for r in results)

    def test_05_hybrid_search_combined(self):
        """Test combined hybrid search mode"""
        query = "血糖检测标准"

        results = self.knowledge_service.search(
            kb_id=self.kb_id,
            query=query,
            search_mode="hybrid",
            top_k=5,
            alpha=0.5  # Equal weight for semantic and keyword
        )

        assert len(results) > 0
        assert "score" in results[0]
        # Combined mode should leverage both search methods
        assert results[0]["score"] > 0

    def test_06_qa_generation(self):
        """Test QA pair generation from document"""
        # Generate QA pairs
        qa_pairs = self.knowledge_service.generate_qa_pairs(
            doc_id=self.doc_id,
            num_pairs=3
        )

        assert len(qa_pairs) > 0
        for qa in qa_pairs:
            assert "question" in qa
            assert "answer" in qa
            assert len(qa["question"]) > 0
            assert len(qa["answer"]) > 0

    def test_07_qa_generalization(self):
        """Test QA generalization"""
        original_qa = {
            "question": "空腹血糖的诊断标准是多少？",
            "answer": "空腹血糖 ≥ 7.0 mmol/L"
        }

        # Generate variations
        variations = self.knowledge_service.generalize_qa(
            question=original_qa["question"],
            answer=original_qa["answer"],
            num_variations=3
        )

        assert len(variations) > 0
        for variant in variations:
            assert "question" in variant
            assert "answer" in variant
            # Questions should be different but semantically similar
            assert variant["question"] != original_qa["question"]


class TestAnnotationWorkflow:
    """Test NLP annotation workflow"""

    @classmethod
    def setup_class(cls):
        """Setup test environment"""
        cls.nlp_service = NLPService()

    def test_01_entity_extraction(self):
        """Test entity extraction from medical text"""
        text = "患者张三，男性，45岁，诊断为2型糖尿病，处方二甲双胍500mg，每日三次。"

        result = self.nlp_service.extract_entities(text)

        assert "entities" in result
        entities = result["entities"]

        # Should extract disease, drug, and dosage entities
        entity_types = [e["type"] for e in entities]
        assert "DISEASE" in entity_types or "疾病" in entity_types
        assert "DRUG" in entity_types or "药物" in entity_types

    def test_02_keyword_extraction(self):
        """Test keyword extraction"""
        text = """
        糖尿病是一组以高血糖为特征的代谢性疾病。
        高血糖则是由于胰岛素分泌缺陷或其生物作用受损引起。
        长期高血糖会导致各种组织的慢性损害和功能障碍。
        """

        result = self.nlp_service.extract_keywords(text, top_k=5)

        assert "keywords" in result
        keywords = result["keywords"]
        assert len(keywords) > 0

        # Should identify key medical terms
        keyword_texts = [k["word"] for k in keywords]
        assert any("糖尿病" in kw or "血糖" in kw for kw in keyword_texts)

    def test_03_text_similarity(self):
        """Test text similarity calculation"""
        text1 = "糖尿病的诊断标准是什么？"
        text2 = "如何诊断糖尿病？"
        text3 = "高血压的治疗方法有哪些？"

        result = self.nlp_service.calculate_similarity(text1, text2)
        similarity_high = result["similarity"]

        result = self.nlp_service.calculate_similarity(text1, text3)
        similarity_low = result["similarity"]

        # Similar questions should have higher similarity
        assert similarity_high > similarity_low
        assert similarity_high > 0.5


class TestAPIEndpoints:
    """Test API endpoints (requires running Flask app)"""

    def test_health_check(self):
        """Test health check endpoint"""
        try:
            response = requests.get(f"{BASE_URL}/api/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
        except requests.exceptions.ConnectionError:
            pytest.skip("Flask app not running")

    def test_knowledge_base_crud(self):
        """Test knowledge base CRUD operations"""
        try:
            # Create
            response = requests.post(
                f"{BASE_URL}/api/knowledge-bases",
                json={
                    "name": "Test KB API",
                    "description": "API test"
                }
            )
            assert response.status_code == 201
            kb_id = response.json()["kb_id"]

            # Read
            response = requests.get(f"{BASE_URL}/api/knowledge-bases/{kb_id}")
            assert response.status_code == 200

            # Update
            response = requests.put(
                f"{BASE_URL}/api/knowledge-bases/{kb_id}",
                json={"description": "Updated description"}
            )
            assert response.status_code == 200

            # Delete
            response = requests.delete(f"{BASE_URL}/api/knowledge-bases/{kb_id}")
            assert response.status_code == 200

        except requests.exceptions.ConnectionError:
            pytest.skip("Flask app not running")

    def test_search_endpoint(self):
        """Test search endpoint"""
        try:
            response = requests.post(
                f"{BASE_URL}/api/search",
                json={
                    "kb_id": "default",
                    "query": "糖尿病",
                    "search_mode": "hybrid",
                    "top_k": 5
                }
            )
            # May return 404 if no default KB, or 200 with results
            assert response.status_code in [200, 404]

        except requests.exceptions.ConnectionError:
            pytest.skip("Flask app not running")


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])
