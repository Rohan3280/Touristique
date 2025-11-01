import os
from langchain_community.document_loaders import CSVLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

os.makedirs("data", exist_ok=True)
os.makedirs("chroma_db", exist_ok=True)

csv_path = "data/places.csv"

if not os.path.exists(csv_path):
    raise FileNotFoundError(f"Could not find {csv_path}. Please add your places.csv file in the /data folder.")

loader = CSVLoader(csv_path)
docs = loader.load()
print(f"Loaded {len(docs)} rows from {csv_path}")

splitter = RecursiveCharacterTextSplitter(chunk_size=400, chunk_overlap=50)
chunks = splitter.split_documents(docs)
print(f"Split into {len(chunks)} chunks")

embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
db = Chroma.from_documents(chunks, embeddings, persist_directory="chroma_db")
db.persist()

print("RAG Index Built! Places loaded.")