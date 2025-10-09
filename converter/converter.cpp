#include <fstream>
#include <iostream>
#include <format>
#include <vector>
#include <string>
#include <map>
#include <random>
#include <chrono>
#include <set>
#include <jansson.h>
#include <ctime>
#include <sstream>

class Quiz {
public:
    int firstIdx = -1;
    std::map<std::string, std::vector<std::pair<int, std::string>>> ansSets;
};

std::string genId(std::string nm) {
    uint64_t hash = 0;
    for(auto c : nm) hash = hash * 23957 + c;
    // std::cout << ">>>>> " << hash << '\n';
    std::mt19937_64 rng(hash);
    std::string ans;
    char mp[] = "0123456789qwertyuiopasdfghjklzxcvbnm";
    for(int i = 0; i < 16; i++) ans.push_back(mp[rng() % (sizeof(mp) - 1)]);
    return ans;
}

int main() {
    std::string curTimeString;
    {
        auto t = std::time(nullptr);
        auto tm = *std::localtime(&t);
        std::ostringstream oss;
        oss << std::put_time(&tm, "%d.%m.%Y %H:%M:%S");
        curTimeString = oss.str();
    }

    std::ifstream infile("./table v1.csv");
    std::string ln;
    std::getline(infile, ln);
    std::string curSection = "none";
    std::map<std::string, Quiz> qzs;

    json_t* rootConfig = json_object();
    json_object_set_new(rootConfig, "title", json_string(std::format("Root, last updated {}", curTimeString).c_str()));
    json_object_set_new(rootConfig, "type", json_string("list"));
    json_object_set_new(rootConfig, "uuid", json_string("root"));
    json_t* rootListItems = json_array();

    while(std::getline(infile, ln)) {
        // while(ln.back() < ' ') ln.pop_back();
        std::vector<std::string> tokens;
        size_t idx = 0;
        // std::cout << "зайцева,, " << ln << '\n';
        while(true) {
            size_t nxt = ln.find(";", idx);
            if(nxt > ln.size()) nxt = ln.size();
            // std::cout << idx << ' ' << nxt << '\n';
            tokens.push_back(ln.substr(idx, nxt - idx));
            if(nxt == ln.size()) break;
            idx = nxt + 1;
        }
        if(tokens.size() != 6) continue;

        for(int i = 0; i < tokens.size(); i++) {
            while(tokens[i].size() && tokens[i].back() == ' ') tokens[i].pop_back();
        }

        if(!tokens[0].empty()) { // new section
            curSection = tokens[0];
            continue;
        }

        // Костыль Александр
        if(tokens[4] == "Афины") tokens[4] = "Афины, Греция";
        if(tokens[4] == "Рим") tokens[4] = "Рим, Италия";

        int idxx = std::stoi(tokens[1]);
        if(qzs[curSection].firstIdx == -1)
            qzs[curSection].firstIdx = idxx;
        qzs[curSection].ansSets["name"].push_back({idxx, tokens[2]});
        qzs[curSection].ansSets["time"].push_back({idxx, tokens[3]});
        qzs[curSection].ansSets["location"].push_back({idxx, tokens[4]});
        qzs[curSection].ansSets["author"].push_back({idxx, tokens[5]});
    }

    std::map<std::string, std::string> ansSetDisplayName;
    ansSetDisplayName["name"] = "Что это?";
    ansSetDisplayName["author"] = "Кто это создал?";
    ansSetDisplayName["time"] = "Когда это создано?";
    ansSetDisplayName["location"] = "Где это?";

    std::vector<std::pair<std::string, std::string>> subsets(5);
    subsets[0] = {"name", "название"};
    subsets[1] = {"author", "автор"};
    subsets[2] = {"time", "время"};
    subsets[3] = {"location", "местоположение"};
    subsets[4] = {"all", "всё подряд"};

    for(auto [key, qz] : qzs) {
        std::set<int> outSubsets;
        for(int ansSubset = 0; ansSubset < subsets.size(); ansSubset++) {
            std::string id = genId(key) + "_" + subsets[ansSubset].first;
            json_t* quiz = json_object();
            json_object_set_new(quiz, "title", json_string(std::format("{} ({})", key, subsets[ansSubset].second).c_str()));
            json_object_set_new(quiz, "type", json_string("quiz"));
            json_object_set_new(quiz, "uuid", json_string(id.c_str()));
            json_object_set_new(quiz, "order", json_string("random"));
            json_object_set_new(quiz, "coverImg", json_string(std::format("prod/{}.jpg", qz.firstIdx).c_str()));

            json_t* questions = json_array();
            json_t* ansSets = json_object();
            int qid = 0;
            for(auto [nm, lst] : qz.ansSets) {
                if(subsets[ansSubset].first != "all" && subsets[ansSubset].first != nm) continue;

                json_t* ansSet = json_array();
                std::map<std::string, int> ansss;
                for(auto [idx, ans] : lst) {
                    if(!ansss.count(ans)) {
                        // std::cout << ">>> да " << ans << '\n';
                        ansss[ans] = ansss.size();
                        json_array_append_new(ansSet, json_string(ans.c_str()));
                    }
                }

                if(ansss.size() < 4) continue;
                outSubsets.insert(ansSubset);

                for(auto [idx, ans] : lst) {
                    json_t* question = json_object();
                    json_object_set_new(question, "id", json_integer(qid++));
                    json_object_set_new(question, "title", json_string(ansSetDisplayName[nm].c_str()));
                    json_object_set_new(question, "contentType", json_string("image"));
                    json_object_set_new(question, "content", json_string(std::format("prod/{}.jpg", idx).c_str()));
                    json_object_set_new(question, "type", json_string("one_choice"));
                    json_object_set_new(question, "answerSet", json_string(nm.c_str()));
                    json_t* rightAns = json_array();
                    json_array_append_new(rightAns, json_integer(ansss[ans]));
                    json_object_set_new(question, "rightChoices", rightAns);
                    json_object_set_new(question, "answerDesc", json_string(ans.c_str()));
                    json_array_append_new(questions, question);
                }
                json_object_set_new(ansSets, nm.c_str(), ansSet);
            }
            json_object_set_new(quiz, "answerSets", ansSets);
            json_object_set_new(quiz, "questions", questions);

            // std::cout << id << '\n';

            std::string output = json_dumps(quiz, JSON_INDENT(0));
            std::ofstream ofs(std::format("../assets/configs/{}.json", id));
            ofs << output;
            ofs.close();
        }

        std::string id = genId(key);
        json_t* quizList = json_object();
        json_object_set_new(quizList, "title", json_string(key.c_str()));
        json_object_set_new(quizList, "type", json_string("list"));
        json_object_set_new(quizList, "uuid", json_string(id.c_str()));
        json_object_set_new(quizList, "coverImg", json_string(std::format("prod/{}.jpg", qz.firstIdx).c_str()));
        json_t* quizListArr = json_array();
        for(int i : outSubsets) {
            json_t* quizListArrItem = json_object();
            json_object_set_new(quizListArrItem, "title", json_string(std::format("{} ({})", key, subsets[i].second).c_str()));
            json_object_set_new(quizListArrItem, "image", json_string(std::format("prod/{}.jpg", qz.firstIdx).c_str()));
            json_object_set_new(quizListArrItem, "target", json_string((id + "_" + subsets[i].first).c_str()));
            json_array_append_new(quizListArr, quizListArrItem);
        }
        json_object_set_new(quizList, "items", quizListArr);
        std::string output = json_dumps(quizList, JSON_INDENT(0));
        std::ofstream ofs(std::format("../assets/configs/{}.json", id));
        ofs << output;
        ofs.close();
        
        json_t* rootListItem = json_object();
        json_object_set_new(rootListItem, "title", json_string(key.c_str()));
        json_object_set_new(rootListItem, "image", json_string(std::format("prod/{}.jpg", qz.firstIdx).c_str()));
        json_object_set_new(rootListItem, "target", json_string(id.c_str()));
        json_array_append_new(rootListItems, rootListItem);
    }

    json_object_set_new(rootConfig, "items", rootListItems);

    std::string output = json_dumps(rootConfig, JSON_INDENT(0));
    std::ofstream ofs("../assets/configs/root.json");
    ofs << output;
    ofs.close();
}
